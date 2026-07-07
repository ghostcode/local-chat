const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// SPA fallback：所有非 API/Socket 路由返回 index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ============================================================
// 全局状态
// ============================================================
const rooms = new Map();                // roomId -> Room
const roomDeleteTimers = new Map();    // roomId -> timeoutId (空房延迟清理)
const pendingLeave = new Map();        // `${roomId}:${nickname}` -> timeoutId

const LEAVE_DELAY_MS = 3000;  // 离开广播延迟，需大于页面跳转重连时间

// ============================================================
// 工具函数
// ============================================================
function generateRoomId() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

function createRoom(roomId, creatorName) {
  return {
    id: roomId,
    createdAt: new Date().toISOString(),
    creator: creatorName,
    creatorBroadcasted: false,   // 是否已广播过"创建了房间"
    users: new Map(),              // socketId -> { nickname, joinedAt }
    messages: []                   // 最近100条
  };
}

function getLocalIPs() {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

// ============================================================
// Socket.io 事件处理
// ============================================================
io.on('connection', (socket) => {
  console.log(`[连接] ${socket.id}`);

  // --- 创建房间 ---
  // 注意：此处只创建房间对象，不注册用户！
  // 用户注册统一在 join-room 中完成，避免跳转时误触发"离开"广播
  socket.on('create-room', ({ nickname }, callback) => {
    if (!nickname || nickname.trim().length === 0) {
      return callback({ error: '昵称不能为空' });
    }
    if (nickname.trim().length > 20) {
      return callback({ error: '昵称最长20个字符' });
    }

    let roomId = generateRoomId();
    while (rooms.has(roomId)) {
      roomId = generateRoomId();
    }

    const room = createRoom(roomId, nickname.trim());
    rooms.set(roomId, room);

    console.log(`[创建] ${nickname} 创建了房间 ${roomId}`);

    callback({
      success: true,
      roomId: roomId,
      nickname: nickname.trim()
    });
    // 不在这里 join 或广播！等客户端跳转到 room.html 后发 join-room
  });

  // --- 检查房间（首页验证用，不注册、不广播） ---
  socket.on('check-room', ({ roomId, nickname }, callback) => {
    if (!nickname || nickname.trim().length === 0) {
      return callback({ error: '昵称不能为空' });
    }
    if (nickname.trim().length > 20) {
      return callback({ error: '昵称最长20个字符' });
    }

    const rid = roomId.trim().toUpperCase();
    const room = rooms.get(rid);
    if (!room) {
      return callback({ error: '房间不存在，请检查房间号' });
    }

    // 昵称已被占用（通常是其他用户），提前拒绝
    for (const [, user] of room.users) {
      if (user.nickname === nickname.trim()) {
        return callback({ error: '该昵称已被使用，请换一个' });
      }
    }

    callback({
      success: true,
      roomId: rid,
      nickname: nickname.trim()
    });
  });

  // --- 加入房间 ---
  socket.on('join-room', ({ roomId, nickname }, callback) => {
    if (!nickname || nickname.trim().length === 0) {
      return callback({ error: '昵称不能为空' });
    }
    if (nickname.trim().length > 20) {
      return callback({ error: '昵称最长20个字符' });
    }

    const rid = roomId.trim().toUpperCase();
    const room = rooms.get(rid);

    if (!room) {
      return callback({ error: '房间不存在，请检查房间号' });
    }

    // 昵称冲突处理：踢掉旧 socket，允许新连接接管
    for (const [sid, user] of room.users) {
      if (user.nickname === nickname.trim()) {
        console.log(`[接管] ${nickname} 旧连接 ${sid} 被新连接踢出`);
        const oldSocket = io.sockets.sockets.get(sid);
        if (oldSocket) {
          oldSocket.disconnect(true);
        }
        room.users.delete(sid);
        break;
      }
    }

    // 取消该用户的"离开"延迟广播（页面跳转导致旧socket断开）
    const leaveKey = `${rid}:${nickname.trim()}`;
    if (pendingLeave.has(leaveKey)) {
      clearTimeout(pendingLeave.get(leaveKey));
      pendingLeave.delete(leaveKey);
      console.log(`[取消离开] ${nickname} 已重连，取消离开广播`);
    }

    // 取消空房间清理定时器
    if (roomDeleteTimers.has(rid)) {
      clearTimeout(roomDeleteTimers.get(rid));
      roomDeleteTimers.delete(rid);
    }

    // 注册用户到房间
    socket.join(rid);
    room.users.set(socket.id, {
      nickname: nickname.trim(),
      joinedAt: new Date().toISOString()
    });

    socket.data.roomId = rid;
    socket.data.nickname = nickname.trim();

    console.log(`[加入] ${nickname} 加入房间 ${rid} (socket: ${socket.id})`);

    // 回调：返回历史消息
    callback({
      success: true,
      roomId: rid,
      nickname: nickname.trim(),
      messages: room.messages.slice(-100),
      creator: room.creator
    });

    // 广播用户列表更新
    broadcastRoomInfo(rid);

    // 广播系统消息（不发给加入者自己）
    const isCreator = room.creator === nickname.trim();
    if (!room.creatorBroadcasted && isCreator) {
      // 创建者首次进入：广播"创建了房间"（只一次）
      room.creatorBroadcasted = true;
      socket.to(rid).emit('system-message', {
        text: `🎉 ${nickname.trim()} 创建了房间`,
        time: new Date().toLocaleTimeString('zh-CN', { hour12: false })
      });
    } else {
      socket.to(rid).emit('system-message', {
        text: `👋 ${nickname.trim()} 加入了房间`,
        time: new Date().toLocaleTimeString('zh-CN', { hour12: false })
      });
    }
  });

  // --- 发送消息 ---
  socket.on('send-message', ({ text }) => {
    const roomId = socket.data.roomId;
    const nickname = socket.data.nickname;

    if (!roomId || !nickname) return;
    if (!text || text.trim().length === 0) return;
    if (text.trim().length > 5000) return;

    const room = rooms.get(roomId);
    if (!room) return;

    const message = {
      id: crypto.randomBytes(4).toString('hex'),
      nickname: nickname,
      text: text.trim(),
      time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      timestamp: Date.now()
    };

    room.messages.push(message);
    if (room.messages.length > 100) {
      room.messages.shift();
    }

    io.to(roomId).emit('new-message', message);
  });

  // --- 发送图片 ---
  socket.on('send-image', ({ image }) => {
    const roomId = socket.data.roomId;
    const nickname = socket.data.nickname;

    if (!roomId || !nickname) return;
    if (!image || typeof image !== 'string') return;
    if (!image.startsWith('data:image/')) return;
    // 限制单张图片 base64 大小不超过 5MB
    if (image.length > 5 * 1024 * 1024) return;

    const room = rooms.get(roomId);
    if (!room) return;

    const message = {
      id: crypto.randomBytes(4).toString('hex'),
      nickname: nickname,
      image: image,
      time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      timestamp: Date.now()
    };

    room.messages.push(message);
    if (room.messages.length > 100) {
      room.messages.shift();
    }

    io.to(roomId).emit('new-message', message);
  });

  // --- 断开连接 ---
  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    const nickname = socket.data.nickname;

    if (roomId && nickname) {
      const room = rooms.get(roomId);
      if (room) {
        room.users.delete(socket.id);

        if (room.users.size === 0) {
          // 房间已空：延迟清理（不广播"离开"）
          console.log(`[空房] 房间 ${roomId} 已无人，将在 5 分钟后自动关闭`);
          roomDeleteTimers.set(roomId, setTimeout(() => {
            rooms.delete(roomId);
            roomDeleteTimers.delete(roomId);
            console.log(`[清理] 房间 ${roomId} 已超时空置，自动关闭`);
          }, 5 * 60 * 1000));
        } else {
          // 房间还有人：延迟广播"离开"，给页面跳转留时间
          const leaveKey = `${roomId}:${nickname}`;
          console.log(`[离开延迟] ${nickname} 断开，${LEAVE_DELAY_MS}ms 后广播离开`);
          pendingLeave.set(leaveKey, setTimeout(() => {
            pendingLeave.delete(leaveKey);

            // 重连检查：该昵称是否已在房间中（新socket已注册）
            const r = rooms.get(roomId);
            if (!r) return;

            const stillInRoom = Array.from(r.users.values())
              .some(u => u.nickname === nickname);
            if (stillInRoom) {
              console.log(`[离开取消] ${nickname} 仍在房间中，取消离开广播`);
              return;
            }

            // 确认已离开：广播用户列表 + 系统消息
            broadcastRoomInfo(roomId);
            io.to(roomId).emit('system-message', {
              text: `🚪 ${nickname} 离开了房间`,
              time: new Date().toLocaleTimeString('zh-CN', { hour12: false })
            });
          }, LEAVE_DELAY_MS));
        }
      }
    }
    console.log(`[断开] 客户端: ${socket.id}`);
  });
});

// ============================================================
// 辅助函数
// ============================================================
function broadcastRoomInfo(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  const users = Array.from(room.users.values()).map(u => u.nickname);
  io.to(roomId).emit('room-info', {
    roomId: roomId,
    users: users,
    creator: room.creator,
    messageCount: room.messages.length
  });
}

// ============================================================
// 启动服务器
// ============================================================
const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIPs();
  console.log('\n========================================');
  console.log('  局域网聊天应用已启动！');
  console.log('========================================');
  console.log(`  端口: ${PORT}`);
  console.log(`  本机访问: http://localhost:${PORT}`);
  for (const ip of ips) {
    console.log(`  局域网访问: http://${ip}:${PORT}`);
  }
  console.log('========================================\n');
});

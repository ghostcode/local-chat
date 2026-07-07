/* ==========================================
   局域网聊天室 - 前端逻辑
   ========================================== */

// 检测是否在聊天室页面
const isRoomPage = window.location.pathname.includes('room');

// 颜色池（用于用户头像）
const avatarColors = [
  '#F8B4C8', '#FCCB9F', '#B5EAD7', '#B5D8EB',
  '#C7CEEA', '#E2C6FF', '#FFD1DC', '#A8D8EA'
];

// ========== 工具函数 ==========
function showToast(msg, duration = 3000) {
  const toast = document.getElementById('toast');
  const toastText = document.getElementById('toastText');
  if (!toast || !toastText) return;
  toastText.textContent = msg;
  toast.style.display = 'flex';
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.style.display = 'none';
  }, duration);
}

function getUserColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('已复制到剪贴板！', 2000);
  } catch {
    // 降级方案
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('已复制到剪贴板！', 2000);
  }
}

function getLocalUrl() {
  return window.location.origin;
}

// ========== 首页逻辑 ==========
if (!isRoomPage) {
  document.addEventListener('DOMContentLoaded', () => {
    const nicknameInput = document.getElementById('nickname');
    const roomIdInput = document.getElementById('roomId');
    const btnCreate = document.getElementById('btnCreate');
    const btnShowJoin = document.getElementById('btnShowJoin');
    const btnJoin = document.getElementById('btnJoin');
    const joinSection = document.getElementById('joinSection');
    const homePanel = document.getElementById('homePanel');
    const loadingPanel = document.getElementById('loadingPanel');
    const loadingText = document.getElementById('loadingText');

    let socket = null;

    // 回车键提交
    nicknameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        btnCreate.click();
      }
    });

    roomIdInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        btnJoin.click();
      }
    });

    // 显示/隐藏加入房间区域
    btnShowJoin.addEventListener('click', () => {
      const isVisible = joinSection.style.display !== 'none';
      joinSection.style.display = isVisible ? 'none' : 'block';
      btnShowJoin.innerHTML = isVisible
        ? '<span class="btn-icon">🚪</span>加入房间'
        : '<span class="btn-icon">✖️</span>取消';
      if (!isVisible) {
        roomIdInput.focus();
      }
    });

    // 创建房间
    btnCreate.addEventListener('click', () => {
      const nickname = nicknameInput.value.trim();
      if (nickname.length < 2) {
        showToast('昵称至少2个字符');
        nicknameInput.focus();
        return;
      }

      homePanel.style.display = 'none';
      loadingPanel.style.display = 'block';
      loadingText.textContent = '正在创建房间...';

      connectAndCreate(nickname);
    });

    // 加入房间
    btnJoin.addEventListener('click', () => {
      const nickname = nicknameInput.value.trim();
      const roomId = roomIdInput.value.trim();

      if (nickname.length < 2) {
        showToast('昵称至少2个字符');
        nicknameInput.focus();
        return;
      }
      if (roomId.length !== 6) {
        showToast('请输入6位房间号');
        roomIdInput.focus();
        return;
      }

      homePanel.style.display = 'none';
      loadingPanel.style.display = 'block';
      loadingText.textContent = '正在加入房间...';

      connectAndJoin(nickname, roomId);
    });

    function connectAndCreate(nickname) {
      socket = io();

      socket.on('connect', () => {
        socket.emit('create-room', { nickname }, (response) => {
          if (response.error) {
            homePanel.style.display = 'block';
            loadingPanel.style.display = 'none';
            showToast(response.error);
            socket.disconnect();
            return;
          }
          // 跳转到聊天室
          sessionStorage.setItem('lanChat', JSON.stringify({
            roomId: response.roomId,
            nickname: response.nickname,
            action: 'created'
          }));
          window.location.href = '/room.html?room=' + response.roomId;
        });
      });

      socket.on('connect_error', () => {
        homePanel.style.display = 'block';
        loadingPanel.style.display = 'none';
        showToast('连接服务器失败，请确认服务已启动');
      });
    }

    function connectAndJoin(nickname, roomId) {
      socket = io();

      socket.on('connect', () => {
        // 首页只做验证，不真正加入房间，避免跳转后 room.html 再次加入导致重复广播
        socket.emit('check-room', { roomId, nickname }, (response) => {
          if (response.error) {
            homePanel.style.display = 'block';
            loadingPanel.style.display = 'none';
            showToast(response.error);
            socket.disconnect();
            return;
          }
          sessionStorage.setItem('lanChat', JSON.stringify({
            roomId: response.roomId,
            nickname: response.nickname,
            action: 'joined'
          }));
          window.location.href = '/room.html?room=' + response.roomId;
        });
      });

      socket.on('connect_error', () => {
        homePanel.style.display = 'block';
        loadingPanel.style.display = 'none';
        showToast('连接服务器失败，请确认服务已启动');
      });
    }

    // 处理URL参数中的房间号（分享链接进入）
    const urlParams = new URLSearchParams(window.location.search);
    const urlRoomId = urlParams.get('room');
    if (urlRoomId && urlRoomId.length === 6) {
      roomIdInput.value = urlRoomId.toUpperCase();
      joinSection.style.display = 'block';
      btnShowJoin.innerHTML = '<span class="btn-icon">✖️</span>取消';
    }

    // 自动聚焦
    nicknameInput.focus();
  });
}

// ========== 聊天室逻辑 ==========
if (isRoomPage) {
  document.addEventListener('DOMContentLoaded', () => {
    // 优先从 URL 参数获取房间号，sessionStorage 作为兜底
    const urlParams = new URLSearchParams(window.location.search);
    const urlRoomId = urlParams.get('room');
    const stored = sessionStorage.getItem('lanChat');

    // URL 中没有房间号，尝试从 sessionStorage 恢复
    if (!urlRoomId) {
      if (stored) {
        const { roomId, nickname } = JSON.parse(stored);
        // 同步 URL 地址
        history.replaceState(null, '', `/room.html?room=${roomId}`);
        initRoom(roomId, nickname, JSON.parse(stored).action || 'joined');
        return;
      }
      window.location.href = '/';
      return;
    }

    // URL 中有房间号，但需要昵称
    if (!stored) {
      // 直接通过分享链接进入，无昵称 → 跳首页预填房间号
      window.location.href = `/?room=${urlRoomId}`;
      return;
    }

    const { roomId, nickname, action } = JSON.parse(stored);

    // 确保 URL 中的房间号与 sessionStorage 一致
    if (urlRoomId !== roomId) {
      history.replaceState(null, '', `/room.html?room=${roomId}`);
    }

    initRoom(roomId, nickname, action);
  });
}

// 聊天室初始化主函数
function initRoom(roomId, nickname, action) {
    const roomIdDisplay = document.getElementById('roomIdDisplay');
    const roomBadge = document.getElementById('roomBadge');
    const onlineCount = document.getElementById('onlineCount');
    const sidebarCount = document.getElementById('sidebarCount');
    const userList = document.getElementById('userList');
    const roomCreator = document.getElementById('roomCreator');
    const messagesContainer = document.getElementById('messagesContainer');
    const messagesEmpty = document.getElementById('messagesEmpty');
    const messageInput = document.getElementById('messageInput');
    const btnSend = document.getElementById('btnSend');
    const btnLeave = document.getElementById('btnLeave');
    const btnCopyRoom = document.getElementById('btnCopyRoom');

    // 分享弹窗
    const shareModal = document.getElementById('shareModal');
    const shareRoomId = document.getElementById('shareRoomId');
    const shareUrl = document.getElementById('shareUrl');
    const btnCopyShare = document.getElementById('btnCopyShare');
    const btnCopyUrl = document.getElementById('btnCopyUrl');
    const btnCloseShare = document.getElementById('btnCloseShare');

    const socket = io();

    // 标题闪烁通知
    const originalTitle = document.title;
    let titleFlashTimer = null;
    let unreadCount = 0;

    function startTitleFlash() {
      if (titleFlashTimer) return;
      let showAlert = true;
      titleFlashTimer = setInterval(() => {
        const alertText = unreadCount > 1 ? `【${unreadCount}条新消息】` : '【新消息】';
        document.title = showAlert ? `${alertText}${originalTitle}` : originalTitle;
        showAlert = !showAlert;
      }, 1000);
    }

    function stopTitleFlash() {
      if (titleFlashTimer) {
        clearInterval(titleFlashTimer);
        titleFlashTimer = null;
      }
      document.title = originalTitle;
      unreadCount = 0;
    }

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        stopTitleFlash();
      }
    });

    // 初始化 UI
    roomIdDisplay.textContent = roomId;
    roomBadge.textContent = roomId;

    // 分享弹窗（仅在创建房间时显示）
    if (action === 'created') {
      shareRoomId.textContent = roomId;
      shareUrl.textContent = `${getLocalUrl()}?room=${roomId}`;
      shareModal.style.display = 'flex';
    }

    // ===== Socket 事件 =====

    // 首次连接：向服务端注册加入房间
    socket.on('connect', () => {
      socket.emit('join-room', { roomId, nickname }, (response) => {
        if (response.error) {
          showToast('加入失败：' + response.error);
          window.location.href = '/';
          return;
        }
        // 渲染服务端返回的历史消息
        if (response.messages && response.messages.length > 0) {
          messagesContainer.innerHTML = '';
          response.messages.forEach(msg => {
            addMessage(msg, msg.nickname === nickname ? 'self' : 'other');
          });
        }
      });
    });

    // 房间信息更新
    socket.on('room-info', (info) => {
      onlineCount.textContent = info.users.length;
      sidebarCount.textContent = info.users.length;
      roomCreator.textContent = `创建者：${info.creator}`;
      updateUserList(info.users);
    });

    // 新消息
    socket.on('new-message', (msg) => {
      addMessage(msg, msg.nickname === nickname ? 'self' : 'other');
      // 页面不在前台且不是自己发的消息，闪烁标题提醒
      if (document.hidden && msg.nickname !== nickname) {
        unreadCount++;
        startTitleFlash();
      }
    });

    // 系统消息
    socket.on('system-message', (msg) => {
      addSystemMessage(msg);
    });

    // 断开重连
    socket.on('disconnect', () => {
      addSystemMessage({
        text: '⚠️ 与服务器断开连接，正在重连...',
        time: new Date().toLocaleTimeString('zh-CN', { hour12: false })
      });
    });

    socket.on('reconnect', () => {
      addSystemMessage({
        text: '✅ 已重新连接',
        time: new Date().toLocaleTimeString('zh-CN', { hour12: false })
      });
      // connect 事件已处理 join-room，这里只做 UI 提示
    });

    // ===== 用户列表 =====
    function updateUserList(users) {
      userList.innerHTML = '';
      users.forEach(name => {
        const li = document.createElement('li');
        const avatar = document.createElement('span');
        avatar.className = 'user-avatar';
        avatar.style.background = getUserColor(name);
        avatar.textContent = name.charAt(0).toUpperCase();

        const nameSpan = document.createElement('span');
        nameSpan.className = 'user-name';
        nameSpan.textContent = name;
        if (name === nickname) {
          nameSpan.textContent += ' (我)';
        }

        li.appendChild(avatar);
        li.appendChild(nameSpan);
        userList.appendChild(li);
      });
    }

    // ===== 消息渲染 =====
    function addMessage(msg, type) {
      // 隐藏空状态
      messagesEmpty.style.display = 'none';

      const wrapper = document.createElement('div');
      wrapper.className = `message-wrapper ${type}`;

      const meta = document.createElement('div');
      meta.className = 'message-meta';

      const nameEl = document.createElement('span');
      nameEl.className = 'message-nickname';
      nameEl.textContent = msg.nickname;

      const timeEl = document.createElement('span');
      timeEl.className = 'message-time';
      timeEl.textContent = msg.time;

      meta.appendChild(nameEl);
      meta.appendChild(timeEl);

      const bubble = document.createElement('div');
      bubble.className = 'message-bubble';

      if (msg.text) {
        const textEl = document.createElement('div');
        textEl.textContent = msg.text;
        bubble.appendChild(textEl);
      }

      if (msg.image) {
        const img = document.createElement('img');
        img.src = msg.image;
        img.className = 'message-image';
        img.alt = '图片';
        img.loading = 'lazy';
        img.addEventListener('click', () => openLightbox(msg.image));
        bubble.appendChild(img);
      }

      wrapper.appendChild(meta);
      wrapper.appendChild(bubble);
      messagesContainer.appendChild(wrapper);

      scrollToBottom();
    }

    function addSystemMessage(msg) {
      messagesEmpty.style.display = 'none';

      const wrapper = document.createElement('div');
      wrapper.className = 'message-wrapper system';

      const bubble = document.createElement('div');
      bubble.className = 'message-bubble';
      bubble.textContent = msg.text;

      wrapper.appendChild(bubble);
      messagesContainer.appendChild(wrapper);

      scrollToBottom();
    }

    function scrollToBottom() {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // ===== 发送消息 =====
    function sendMessage() {
      const text = messageInput.value.trim();
      if (!text) return;

      socket.emit('send-message', { text });
      messageInput.value = '';
      messageInput.style.height = 'auto';
      messageInput.focus();
    }

    btnSend.addEventListener('click', sendMessage);

    messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // 自动调整输入框高度
    messageInput.addEventListener('input', () => {
      messageInput.style.height = 'auto';
      messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
    });

    const btnImage = document.getElementById('btnImage');
    const imageInput = document.getElementById('imageInput');
    const imageLightbox = document.getElementById('imageLightbox');
    const lightboxImage = document.getElementById('lightboxImage');

    // ===== 图片发送 =====
    const MAX_IMAGE_WIDTH = 1280;
    const MAX_IMAGE_HEIGHT = 1280;
    const IMAGE_QUALITY = 0.8;

    btnImage.addEventListener('click', () => {
      imageInput.click();
    });

    imageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        showToast('请选择图片文件');
        imageInput.value = '';
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        showToast('图片大小不能超过 10MB');
        imageInput.value = '';
        return;
      }

      compressImage(file).then((base64) => {
        socket.emit('send-image', { image: base64 });
        imageInput.value = '';
      }).catch((err) => {
        console.error('图片压缩失败:', err);
        showToast('图片处理失败');
        imageInput.value = '';
      });
    });

    function compressImage(file) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          let { width, height } = img;
          if (width > MAX_IMAGE_WIDTH || height > MAX_IMAGE_HEIGHT) {
            const ratio = Math.min(MAX_IMAGE_WIDTH / width, MAX_IMAGE_HEIGHT / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          URL.revokeObjectURL(url);
          const base64 = canvas.toDataURL('image/jpeg', IMAGE_QUALITY);
          resolve(base64);
        };
        img.onerror = (err) => {
          URL.revokeObjectURL(url);
          reject(err);
        };
        img.src = url;
      });
    }

    function openLightbox(src) {
      lightboxImage.src = src;
      imageLightbox.classList.remove('hidden');
    }

    function closeLightbox() {
      imageLightbox.classList.add('hidden');
      lightboxImage.src = '';
    }

    imageLightbox.addEventListener('click', closeLightbox);

    // ===== Emoji 面板 =====
    const btnEmoji = document.getElementById('btnEmoji');
    const emojiPanel = document.getElementById('emojiPanel');
    const emojiGrid = document.getElementById('emojiGrid');

    // 常用 emoji 列表（按分类）
    const emojiList = [
      '😀','😃','😄','😁','😆','😅','🤣','😂',
      '🙂','🙃','😉','😊','😇','🥰','😍','🤩',
      '😘','😗','😚','😙','🥲','😋','😛','😜',
      '🤪','😝','🤑','🤗','🤭','🫢','🫣','🤫',
      '🤔','🫡','🤐','🤨','😐','😑','😶','🫥',
      '😏','😒','🙄','😬','🤥','🫨','🫤','😌',
      '😔','😪','🤤','😴','😷','🤒','🤕','🤢',
      '🥵','🥶','🥴','🥵','💀','☠️','💩','🤖',
      '😺','😸','😹','😻','😼','😽','🙀','😿',
      '🙈','🙉','🙊','💌','💘','💝','💖','💗',
      '💓','💞','💕','❣️','💔','❤️','🧡','💛',
      '💚','💙','💜','🤎','🖤','🤍','💋','👋',
      '🤚','🖐️','✋','🖖','🫱','🫲','🫳','🫴',
      '👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙',
      '👈','👉','👆','🖕','👇','☝️','🫏','🫐',
      '🙏','✍️','💅','🤳','💪','🦾','🦿','🦵',
      '🦶','👂','🦻','👃','🧠','🗣️','👤','👥',
      '👶','🧒','👦','👧','🧑','👱','👨','🧔',
      '👩','🧓','👴','👵','🙍','🙎','🙅','🙆',
      '💏','💑','👪','👰','🧑🍼','🏻','🧑🎄','🧑🚀',
      '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼',
      '🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈',
      '🐒','🐔','🐧','🐦','🐤','🦆','🦢','🦅',
      '🦉','🦚','🦜','🐸','🐍','🐢','🦎','🐙',
      '🦑','🦐','🦞','🦀','🐟','🐠','🐡','🦈',
      '🐳','🐋','🐬','🦭','🐘','🦏','🦛','🐪',
      '🐫','🦒','🐃','🐂','🐄','🐎','🐖','🐏',
      '🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐕🦺',
      '🐈','🐈⬛','🪶','🐓','🦃','🦚','🦜','🦢',
      '🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓',
      '🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥑',
      '🍆','🥔','🥕','🌽','🌶️','🫑','🥒','🥬',
      '🥦','🫛','🫘','🌰','🥜','🫘','🌰','🍞',
      '🥐','🥖','🫓','🥨','🥯','🥞','🧇','🥓',
      '🥩','🍗','🍖','🦴','🌭','🍔','🍟','🍕',
      '🫒','🥗','🥘','🫕','🍜','🍣','🍱','🍛',
      '🍲','🍤','🥟','🥠','🥡','🦀','🦞','🦐',
      '🍦','🍧','🍨','🍩','🍪','🎂','🍰','🧁',
      '🍫','🍬','🍭','🍮','🍯','🍼','🥛','🫗',
      '🍵','☕','🍶','🍺','🍻','🥂','🍷','🥃',
      '🍸','🍹','🧉','🧊','🥤','🧋','🧃','🧴',
      '⚽','🏀','🏈','⚾','🥎','🎾','🏐','🎱',
      '🏓','🏸','🏒','🏑','🏏','🪃','🥊','🥋',
      '🎳','🎯','🎮','🎰','🎲','🧩','🧸','🪅',
      '♠️','♥️','♦️','♣️','🃏','🀄','🎴','🎴',
      '🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑',
      '🚒','🚐','🛻','🚚','🚛','🚜','🏍️','🛵',
      '🛺','🚲','🛴','🛹','🛼','🚏','🛣️','🛤️',
      '✈️','🚀','🛸','🚁','🛶','🚤','🛥️','🛳️',
      '⛵','🚢','🚧','⚓️','⛽','🚥','🚦','🚇',
      '🚸','🛑','🚧','🛝','🛞','🛟','🛠️','🛡️',
      '🛒','🩼','🪝','🪞','🪟','🪠','🪡','🪢',
      '🩹','🩺','🩻','🩼','🪫','🩰','🪮','🪔',
      '🪓','🪃','🪵','🪶','🪸','🪹','🪺','🪻',
      '🎃','🎄','🎆','🎇','🧨','🧧','🎈','🎉',
      '🎊','🎋','🎍','🎎','🎏','🎐','🎑','🎒',
      '🎓','🎔','🎕','🎖️','🎗️','🎘','🎙️','🎚️',
      '🎛️','🎜️','🎝️','🎞️','🎟️','🎠','🎡','🎢',
      '🎪','🎫','🎬','🎭','🎮','🎯','🎰','🎱',
      '🎲','🎳','🎴','🎵','🎶','🎷','🎸','🎹',
      '🎺','🎻','🎼','🎽','🎾','🎿','🏀','🏁',
      '🏂','🏃','🏄','🏅','🏆','🏇','🏈','🏉',
      '🏊','🏋️','🏌️','🏍️','🏎️','🏏','🏐','🏑',
      '🏒','🏓','🏔','🏕','🏖','🏗️','🏘️','🏙️',
      '🏚️','🏛️','🏜️','🏝️','🏞️','🏟️','🏠️','🏡️',
      '🈶️','🉐️','🉑️','🈹️','🈚️','🈯️','🉐️','🉑️',
      '㊗️','㊙️','🈲️','🉐️','🉑️','㊙️','🈵️','🔴',
      '🔵','⚫','⚪','🟣','🟤','🟠','🟡','🟢',
      '🔞','📴','♿️','〽️','⚠️','♻️','⚜️','🔱',
      '📛','⭕','❌','❎','✅','🆚','🛑','⬛',
      '⬜','🟧','🟨','🟩','🟦','🟪','🟫','⬛',
    ];

    // 渲染 emoji 网格
    function renderEmojiGrid() {
      emojiGrid.innerHTML = '';
      emojiList.forEach(e => {
        const span = document.createElement('span');
        span.textContent = e;
        span.className = 'emoji-item cursor-pointer text-xl leading-[1] p-1.5 rounded-lg hover:bg-surface-hover transition-colors duration-150 select-none';
        span.addEventListener('click', () => {
          insertEmoji(e);
        });
        emojiGrid.appendChild(span);
      });
    }

    // 在光标位置插入 emoji
    function insertEmoji(emoji) {
      const start = messageInput.selectionStart;
      const end = messageInput.selectionEnd;
      const text = messageInput.value;
      messageInput.value = text.slice(0, start) + emoji + text.slice(end);
      const newPos = start + emoji.length;
      messageInput.selectionStart = newPos;
      messageInput.selectionEnd = newPos;
      messageInput.focus();
      // 触发表单高度自适应
      messageInput.style.height = 'auto';
      messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
    }

    // 切换 emoji 面板
    btnEmoji.addEventListener('click', (e) => {
      e.stopPropagation();
      if (emojiPanel.classList.contains('hidden')) {
        // 定位面板在按钮上方
        const rect = btnEmoji.getBoundingClientRect();
        emojiPanel.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
        emojiPanel.style.left = rect.left + 'px';
        emojiPanel.classList.remove('hidden');
        if (!emojiGrid.children.length) renderEmojiGrid();
        messageInput.focus();
      } else {
        emojiPanel.classList.add('hidden');
      }
    });

    // 点击页面其他区域关闭面板
    document.addEventListener('click', (e) => {
      if (!emojiPanel.contains(e.target) && e.target !== btnEmoji) {
        emojiPanel.classList.add('hidden');
      }
    });

    // ===== 按钮事件 =====
    btnCopyRoom.addEventListener('click', () => {
      const shareLink = `${getLocalUrl()}?room=${roomId}`;
      copyToClipboard(shareLink);
    });

    btnLeave.addEventListener('click', () => {
      if (confirm('确定要离开房间吗？')) {
        sessionStorage.removeItem('lanChat');
        window.location.href = '/';
      }
    });

    // 分享弹窗按钮
    btnCopyShare.addEventListener('click', () => {
      copyToClipboard(shareRoomId.textContent);
    });

    btnCopyUrl.addEventListener('click', () => {
      copyToClipboard(shareUrl.textContent);
    });

    btnCloseShare.addEventListener('click', () => {
      shareModal.style.display = 'none';
      // 清除 created 标记，避免刷新后重复弹窗
      try {
        const stored = JSON.parse(sessionStorage.getItem('lanChat') || '{}');
        if (stored.action === 'created') {
          stored.action = 'joined';
          sessionStorage.setItem('lanChat', JSON.stringify(stored));
        }
      } catch {}
      messageInput.focus();
    });

    // 点击蒙层关闭弹窗
    shareModal.addEventListener('click', (e) => {
      if (e.target === shareModal) {
        shareModal.style.display = 'none';
        // 清除 created 标记，避免刷新后重复弹窗
        try {
          const stored = JSON.parse(sessionStorage.getItem('lanChat') || '{}');
          if (stored.action === 'created') {
            stored.action = 'joined';
            sessionStorage.setItem('lanChat', JSON.stringify(stored));
          }
        } catch {}
        messageInput.focus();
      }
    });

    // 聚焦输入框
    messageInput.focus();
}

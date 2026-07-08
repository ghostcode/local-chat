<template>
  <div class="max-w-[1000px] mx-auto h-screen flex flex-col">
    <!-- 顶部信息栏 -->
    <header class="flex items-center justify-between px-5 py-3 bg-white border-b border-pink-100 shrink-0">
      <div class="flex items-center gap-2.5">
        <span
          id="roomBadge"
          class="bg-gradient-to-r from-macaron-pink to-macaron-peach text-white text-xs font-bold
                 px-2.5 py-1 rounded-lg tracking-wider"
        >ROOM</span>
        <span id="roomIdDisplay" class="font-mono text-base font-bold text-gray-700 tracking-[0.15em]">{{ roomId }}</span>
        <button
          id="btnCopyRoom"
          title="复制房间地址"
          class="bg-surface-hover px-2 py-1.5 rounded-lg text-sm cursor-pointer
                 hover:bg-macaron-pink transition-colors duration-200"
          @click="copyRoomUrl"
        >📋</button>
      </div>
      <div class="flex items-center gap-1.5">
        <span id="onlineCount" class="text-lg font-bold text-macaron-mint-d">{{ onlineCount }}</span>
        <span class="text-xs text-gray-300">人在线</span>
      </div>
      <button
        id="btnLeave"
        title="离开房间"
        class="text-xl opacity-60 hover:opacity-100 hover:bg-surface-hover px-1.5 py-1 rounded-lg
               cursor-pointer transition-all duration-200"
        @click="onLeave"
      >✖️</button>
    </header>

    <!-- 主体区域 -->
    <div class="flex flex-1 overflow-hidden">
      <!-- 侧边栏 - 用户列表 -->
      <aside id="userSidebar" class="w-[200px] bg-surface-sidebar border-r border-pink-100 flex flex-col shrink-0 max-sm:hidden">
        <div class="flex items-center justify-between px-4 py-4 text-xs font-semibold text-gray-400 border-b border-pink-50">
          <span>在线成员</span>
          <span id="sidebarCount" class="bg-macaron-mint-d text-white text-[11px] px-2.5 py-0.5 rounded-full">{{ onlineCount }}</span>
        </div>
        <ul id="userList" class="user-list flex-1 overflow-y-auto p-2 space-y-0.5">
          <li v-for="name in users" :key="name">
            <span class="user-avatar" :style="{ background: getUserColor(name) }">{{ name.charAt(0).toUpperCase() }}</span>
            <span class="user-name">{{ name }}{{ name === nickname ? ' (我)' : '' }}</span>
            <button
              v-if="nickname === creator && name !== nickname"
              title="踢出房间"
              class="ml-auto text-xs text-gray-300 hover:text-macaron-pink-d px-1.5 py-1 rounded transition-colors"
              @click="kickUser(name)"
            >✖</button>
          </li>
        </ul>
        <div class="px-4 py-3 border-t border-pink-50">
          <p id="roomCreator" class="text-[11px] text-gray-300 truncate">创建者：{{ creator }}</p>
        </div>
      </aside>

      <!-- 聊天区域 -->
      <main class="flex-1 flex flex-col bg-white min-w-0">
        <!-- 消息列表 -->
        <div id="messagesContainer" ref="messagesContainer" class="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-1">
          <div v-if="messages.length === 0" id="messagesEmpty" class="text-center text-gray-300 py-16 m-auto">
            <div class="text-5xl mb-3 opacity-60">💬</div>
            <p>还没有消息，发送第一条吧！</p>
          </div>

          <div
            v-for="(msg, idx) in messages"
            :key="msg.id || msg.timestamp || idx"
            class="message-wrapper"
            :class="msgType(msg)"
          >
            <div v-if="msgType(msg) !== 'system'" class="message-meta">
              <span class="message-nickname">{{ msg.nickname }}</span>
              <span class="message-time">{{ msg.time }}</span>
            </div>
            <div class="message-bubble">
              <div v-if="msg.text">{{ msg.text }}</div>
              <img
                v-if="msg.image"
                :src="msg.image"
                alt="图片"
                class="message-image"
                loading="lazy"
                @click="openLightbox(msg.image!)"
              />
            </div>
          </div>
        </div>

        <!-- 输入区域 -->
        <div class="px-5 py-4 border-t border-pink-100 bg-white">
          <div class="flex gap-2.5 items-end">
            <button
              id="btnEmoji"
              title="表情"
              class="w-12 h-12 rounded-xl bg-surface-input border-2 border-pink-100 flex items-center
                     justify-center shrink-0 cursor-pointer transition-all duration-200 text-xl
                     hover:border-macaron-blue-d hover:bg-white active:scale-95 select-none"
              @click.stop="toggleEmoji"
            >😊</button>
            <button
              id="btnImage"
              title="发送图片"
              class="w-12 h-12 rounded-xl bg-surface-input border-2 border-pink-100 flex items-center
                     justify-center shrink-0 cursor-pointer transition-all duration-200 text-xl
                     hover:border-macaron-mint-d hover:bg-white active:scale-95 select-none"
              @click="onSelectImage"
            >📷</button>
            <input id="imageInput" ref="imageInput" type="file" accept="image/*" class="hidden" @change="onImageChange">
            <textarea
              id="messageInput"
              ref="messageInput"
              v-model="messageText"
              placeholder="输入消息... (Enter 发送，Shift+Enter 换行)"
              rows="1"
              maxlength="5000"
              class="flex-1 px-4 py-3 border-2 border-pink-100 rounded-2xl text-sm bg-surface-input text-gray-700
                     placeholder-gray-300 outline-none resize-none transition-all duration-200
                     focus:border-macaron-blue-d focus:bg-white focus:ring-4 focus:ring-blue-100
                     leading-relaxed max-h-[120px]"
              @keydown.enter.prevent="onEnterSend"
              @input="autoResize"
            ></textarea>
            <button
              id="btnSend"
              title="发送"
              class="w-12 h-12 rounded-xl bg-gradient-to-br from-macaron-blue-d to-macaron-lav-d text-white
                     flex items-center justify-center shrink-0 cursor-pointer transition-all duration-200
                     hover:scale-105 hover:shadow-lg hover:shadow-lavender-300/30 active:scale-95"
              @click="sendMessage"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      </main>
    </div>

    <!-- Emoji 面板 -->
    <div
      id="emojiPanel"
      class="fixed z-[90] bg-white rounded-2xl shadow-xl border border-pink-100 p-3 overflow-hidden"
      :class="{ hidden: !emojiVisible }"
      :style="emojiStyle"
      @click.stop
    >
      <emoji-picker
        class="light emoji-picker-macaron"
        @emoji-click="onEmojiClick"
      ></emoji-picker>
    </div>

    <!-- 分享房间弹窗 -->
    <div
      v-show="showShare"
      id="shareModal"
      class="fixed inset-0 bg-black/30 flex items-center justify-center z-[100] backdrop-blur-sm"
      @click.self="closeShare"
    >
      <div class="bg-white rounded-2xl p-8 w-[90%] max-w-[420px] shadow-xl text-center">
        <h3 class="text-2xl font-bold mb-2">🎉 房间已创建</h3>
        <p class="text-sm text-gray-400 mb-6">分享以下信息给朋友，让他们加入你的房间：</p>
        <div class="bg-surface-input rounded-xl p-5 mb-6 text-left">
          <div class="mb-4">
            <label class="block text-[11px] font-semibold text-gray-400 uppercase mb-1.5">房间号</label>
            <div class="flex gap-2 items-center">
              <code
                id="shareRoomId"
                class="flex-1 bg-white px-3 py-2.5 rounded-lg text-sm text-gray-700 font-mono font-semibold
                       border border-pink-50 select-all"
              >{{ roomId }}</code>
              <button
                id="btnCopyShare"
                class="bg-macaron-mint-d text-white px-4 py-2.5 rounded-lg text-xs font-semibold
                       hover:bg-[#6DBB9A] transition-colors duration-200 whitespace-nowrap cursor-pointer"
                @click="copyText(roomId)"
              >复制</button>
            </div>
          </div>
          <div>
            <label class="block text-[11px] font-semibold text-gray-400 uppercase mb-1.5">访问地址</label>
            <div class="flex gap-2 items-center">
              <code
                id="shareUrl"
                class="flex-1 bg-white px-3 py-2.5 rounded-lg text-sm text-gray-700 font-mono font-semibold
                       border border-pink-50 select-all truncate"
              >{{ shareUrl }}</code>
              <button
                id="btnCopyUrl"
                class="bg-macaron-mint-d text-white px-4 py-2.5 rounded-lg text-xs font-semibold
                       hover:bg-[#6DBB9A] transition-colors duration-200 whitespace-nowrap cursor-pointer"
                @click="copyText(shareUrl)"
              >复制</button>
            </div>
          </div>
        </div>
        <button
          id="btnCloseShare"
          class="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white text-sm font-semibold
                 bg-gradient-to-r from-macaron-pink-d to-[#E892A8] shadow-md shadow-pink-200
                 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-pink-200/50 active:translate-y-0 transition-all duration-200"
          @click="closeShare"
        >
          进入房间
        </button>
      </div>
    </div>
  </div>

  <!-- 图片预览弹窗 -->
  <div
    v-show="lightboxSrc"
    id="imageLightbox"
    class="fixed inset-0 bg-black/80 flex items-center justify-center z-[200]"
    @click="closeLightbox"
  >
    <img id="lightboxImage" :src="lightboxSrc" alt="预览" class="max-w-[90%] max-h-[90%] rounded-lg shadow-2xl">
  </div>

  <!-- Toast 提示 -->
  <div
    v-show="toastVisible"
    id="toast"
    class="fixed top-5 left-1/2 -translate-x-1/2 bg-white text-gray-700 px-6 py-3 rounded-xl
           shadow-lg z-[1000] text-sm font-medium flex items-center gap-2.5 border-l-4 border-yellow-500
           animate-[slideDown_.3s_ease]"
  >
    <span class="text-lg">⚠️</span>
    <span>{{ toastMsg }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useSocket, socketEmit, sendMessage as emitSendMessage, sendImage as emitSendImage } from '@/composables/useSocket';
import { getSession, setSession, clearSession, getLocalUrl, getUserColor } from '@/utils';
import type { ChatMessage, RoomInfo, JoinResponse } from '@/types';
import 'emoji-picker-element';

const router = useRouter();

const roomId = ref('');
const nickname = ref('');
const creator = ref('');
const users = ref<string[]>([]);
const messages = ref<ChatMessage[]>([]);
const messageText = ref('');
const messagesContainer = ref<HTMLElement | null>(null);
const messageInput = ref<HTMLTextAreaElement | null>(null);
const imageInput = ref<HTMLInputElement | null>(null);

const onlineCount = computed(() => users.value.length);

// 分享弹窗
const showShare = ref(false);
const shareUrl = computed(() => `${getLocalUrl()}/?room=${roomId.value}`);

// emoji 面板
const emojiVisible = ref(false);
const emojiStyle = ref({ bottom: '0px', left: '0px' });

// 图片预览
const lightboxSrc = ref('');

// Toast
const toastVisible = ref(false);
const toastMsg = ref('');
let toastTimer: ReturnType<typeof setTimeout> | null = null;

const socket = useSocket();
const originalTitle = document.title;
let titleFlashTimer: ReturnType<typeof setInterval> | null = null;
let unreadCount = 0;

function showToast(msg: string, duration = 3000) {
  toastMsg.value = msg;
  toastVisible.value = true;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastVisible.value = false;
  }, duration);
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('已复制到剪贴板！');
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('已复制到剪贴板！');
  }
}

function copyRoomUrl() {
  copyText(shareUrl.value);
}

function msgType(msg: ChatMessage): 'self' | 'other' | 'system' {
  if (!msg.nickname) return 'system';
  if (msg.nickname === nickname.value) return 'self';
  return 'other';
}

function scrollToBottom() {
  nextTick(() => {
    const el = messagesContainer.value;
    if (el) el.scrollTop = el.scrollHeight;
  });
}

function addMessage(msg: ChatMessage) {
  messages.value.push(msg);
  scrollToBottom();
}

function addSystemMessage(msg: { text: string; time: string }) {
  messages.value.push({
    id: 'sys-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
    nickname: '',
    text: msg.text,
    time: msg.time,
    timestamp: Date.now()
  } as ChatMessage);
  scrollToBottom();
}

function onEnterSend(e: KeyboardEvent) {
  if (!e.shiftKey) {
    sendMessage();
  }
}

function autoResize(e: Event) {
  const target = e.target as HTMLTextAreaElement;
  target.style.height = 'auto';
  target.style.height = Math.min(target.scrollHeight, 120) + 'px';
}

function sendMessage() {
  const text = messageText.value.trim();
  if (!text) return;
  emitSendMessage(socket, text);
  messageText.value = '';
  nextTick(() => {
    if (messageInput.value) {
      messageInput.value.style.height = 'auto';
      messageInput.value.focus();
    }
  });
}

function onSelectImage() {
  imageInput.value?.click();
}

function onImageChange(e: Event) {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('请选择图片文件');
    target.value = '';
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showToast('图片大小不能超过 10MB');
    target.value = '';
    return;
  }
  compressImage(file).then((base64) => {
    emitSendImage(socket, base64);
    target.value = '';
  }).catch((err) => {
    console.error('图片压缩失败:', err);
    showToast('图片处理失败');
    target.value = '';
  });
}

function compressImage(file: File): Promise<string> {
  const MAX_IMAGE_WIDTH = 1280;
  const MAX_IMAGE_HEIGHT = 1280;
  const IMAGE_QUALITY = 0.8;
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
      if (!ctx) return reject(new Error('canvas context error'));
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

function openLightbox(src: string) {
  lightboxSrc.value = src;
}

function closeLightbox() {
  lightboxSrc.value = '';
}

// emoji
// emoji
function toggleEmoji(e: MouseEvent) {
  e.stopPropagation();
  if (emojiVisible.value) {
    emojiVisible.value = false;
    return;
  }
  const target = e.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  emojiStyle.value = {
    bottom: `${window.innerHeight - rect.top + 8}px`,
    left: `${rect.left}px`
  };
  emojiVisible.value = true;
}

function onEmojiClick(e: Event) {
  const event = e as CustomEvent;
  const emoji = event.detail?.emoji?.unicode;
  if (emoji) {
    insertEmoji(emoji);
  }
}

function insertEmoji(emoji: string) {
  const input = messageInput.value;
  if (!input) return;
  const start = input.selectionStart ?? 0;
  const end = input.selectionEnd ?? 0;
  const text = messageText.value;
  messageText.value = text.slice(0, start) + emoji + text.slice(end);
  nextTick(() => {
    input.focus();
    const newPos = start + emoji.length;
    input.selectionStart = newPos;
    input.selectionEnd = newPos;
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });
}

function closeEmojiPanel(e: MouseEvent) {
  const target = e.target as HTMLElement;
  const panel = document.getElementById('emojiPanel');
  const btn = document.getElementById('btnEmoji');
  if (panel && !panel.contains(target) && btn && !btn.contains(target)) {
    emojiVisible.value = false;
  }
}

function closeShare() {
  showShare.value = false;
  // 清除 created 标记，避免刷新后重复弹窗
  const stored = getSession();
  if (stored && stored.action === 'created') {
    stored.action = 'joined';
    setSession(stored);
  }
  nextTick(() => messageInput.value?.focus());
}

function onLeave() {
  if (confirm('确定要离开房间吗？')) {
    clearSession();
    router.push('/');
  }
}

// 标题闪烁
function startTitleFlash() {
  if (titleFlashTimer) return;
  let showAlert = true;
  titleFlashTimer = setInterval(() => {
    const alertText = unreadCount > 1 ? `【${unreadCount}条新消息】` : '【新消息】';
    document.title = showAlert ? `${alertText}聊天室` : originalTitle;
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

function onVisibilityChange() {
  if (!document.hidden) {
    stopTitleFlash();
  }
}

function kickUser(targetName: string) {
  if (nickname.value !== creator.value) {
    showToast('只有房主才能踢人');
    return;
  }
  if (targetName === nickname.value) {
    showToast('不能踢出自己');
    return;
  }
  if (!confirm(`确定要将 "${targetName}" 踢出房间吗？`)) {
    return;
  }
  socketEmit<{ success?: boolean; error?: string }>(socket, 'kick-user', { targetNickname: targetName })
    .then((res) => {
      if (res.error) {
        showToast(res.error);
      }
    })
    .catch(() => {
      showToast('踢人失败，请重试');
    });
}

onMounted(async () => {
  document.addEventListener('click', closeEmojiPanel);
  document.addEventListener('visibilitychange', onVisibilityChange);

  // 优先从 URL 参数获取房间号
  const urlParams = new URLSearchParams(window.location.search);
  const urlRoomId = urlParams.get('room');
  const stored = getSession();

  if (!urlRoomId) {
    if (stored) {
      history.replaceState(null, '', `/room?room=${stored.roomId}`);
      roomId.value = stored.roomId;
      nickname.value = stored.nickname;
      initRoom(stored.action || 'joined');
      return;
    }
    router.push('/');
    return;
  }

  if (!stored) {
    router.push(`/?room=${urlRoomId}`);
    return;
  }

  if (urlRoomId !== stored.roomId) {
    history.replaceState(null, '', `/room?room=${stored.roomId}`);
  }

  roomId.value = stored.roomId;
  nickname.value = stored.nickname;
  initRoom(stored.action || 'joined');
});

onUnmounted(() => {
  document.removeEventListener('click', closeEmojiPanel);
  document.removeEventListener('visibilitychange', onVisibilityChange);
  stopTitleFlash();
  if (toastTimer) clearTimeout(toastTimer);
  socket.disconnect();
});

async function initRoom(action: 'created' | 'joined') {
  if (action === 'created') {
    showShare.value = true;
  }

  socket.on('connect', async () => {
    const res = await socketEmit<JoinResponse>(socket, 'join-room', {
      roomId: roomId.value,
      nickname: nickname.value
    });
    if (res.error) {
      showToast('加入失败：' + res.error);
      router.push('/');
      return;
    }
    creator.value = res.creator;
    if (res.messages && res.messages.length > 0) {
      messages.value = [...res.messages];
      scrollToBottom();
    }
  });

  socket.on('room-info', (info: RoomInfo) => {
    users.value = info.users;
    creator.value = info.creator;
  });

  socket.on('new-message', (msg: ChatMessage) => {
    addMessage(msg);
    if (document.hidden && msg.nickname !== nickname.value) {
      unreadCount++;
      startTitleFlash();
    }
  });

  socket.on('system-message', (msg: { text: string; time: string }) => {
    addSystemMessage(msg);
  });

  socket.on('kicked', (msg: { text: string; time: string }) => {
    addSystemMessage(msg);
    alert(msg.text);
    clearSession();
    router.push('/');
  });

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
  });
}

// 监听消息数量变化，保持滚动到底部
watch(messages, scrollToBottom, { deep: true });
</script>
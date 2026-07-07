<template>
  <div class="max-w-lg mx-auto px-5 py-10 min-h-screen flex flex-col justify-center items-center">
    <!-- 首页面板 -->
    <div v-if="panel === 'home'" id="homePanel">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="text-6xl mb-3 drop-shadow-sm">💬</div>
        <h1 class="text-3xl font-bold text-gray-700 mb-2">局域网聊天室</h1>
        <p class="text-sm text-gray-400">输入昵称，创建或加入一个房间</p>
      </div>

      <!-- 表单卡片 -->
      <div class="bg-white rounded-2xl p-8 w-full max-w-[420px] shadow-lg border border-pink-100">
        <!-- 昵称 -->
        <div class="mb-5">
          <label for="nickname" class="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            你的昵称
          </label>
          <input
            id="nickname"
            v-model="nickname"
            type="text"
            placeholder="输入昵称（2-20个字符）"
            maxlength="20"
            autocomplete="off"
            class="w-full px-4 py-3.5 border-2 border-pink-100 rounded-xl text-base bg-surface-input text-gray-700
                   placeholder-gray-300 outline-none transition-all duration-200
                   focus:border-macaron-pink-d focus:bg-white focus:ring-4 focus:ring-pink-100"
            @keydown.enter="onCreate"
          />
        </div>

        <!-- 操作按钮 -->
        <div class="flex gap-3">
          <button
            id="btnCreate"
            class="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-white text-sm font-semibold
                   bg-gradient-to-r from-macaron-pink-d to-[#E892A8] shadow-md shadow-pink-200
                   hover:-translate-y-0.5 hover:shadow-lg hover:shadow-pink-200/50 active:translate-y-0 transition-all duration-200"
            @click="onCreate"
          >
            <span class="text-lg">🏠</span> 创建房间
          </button>
          <button
            id="btnShowJoin"
            class="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-gray-600 text-sm font-semibold
                   bg-white border-2 border-pink-100
                   hover:bg-surface-hover hover:border-macaron-pink active:translate-y-0 transition-all duration-200"
            @click="toggleJoin"
          >
            <span class="text-lg">{{ joinVisible ? '✖️' : '🚪' }}</span>
            {{ joinVisible ? '取消' : '加入房间' }}
          </button>
        </div>

        <!-- 加入房间区域 -->
        <div v-show="joinVisible" id="joinSection" class="mt-0">
          <div class="flex items-center my-6 text-xs text-gray-300">
            <span class="flex-1 h-px bg-pink-50"></span>
            <span class="px-4">输入房间号加入</span>
            <span class="flex-1 h-px bg-pink-50"></span>
          </div>
          <div class="mb-5">
            <label for="roomId" class="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              房间号
            </label>
            <input
              id="roomId"
              v-model="roomId"
              type="text"
              placeholder="输入6位房间号"
              maxlength="6"
              autocomplete="off"
              class="w-full px-4 py-3.5 border-2 border-pink-100 rounded-xl text-base bg-surface-input text-gray-700
                     uppercase placeholder-gray-300 outline-none transition-all duration-200
                     focus:border-macaron-pink-d focus:bg-white focus:ring-4 focus:ring-pink-100 tracking-widest font-mono"
              @keydown.enter="onJoin"
            />
          </div>
          <button
            id="btnJoin"
            class="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white text-sm font-semibold
                   bg-gradient-to-r from-macaron-mint-d to-[#6DBB9A] shadow-md shadow-green-200
                   hover:-translate-y-0.5 hover:shadow-lg hover:shadow-green-200/50 active:translate-y-0 transition-all duration-200"
            @click="onJoin"
          >
            <span class="text-lg">✨</span> 加入房间
          </button>
        </div>
      </div>

      <!-- 提示 -->
      <div class="mt-6 text-center">
        <p class="text-xs text-gray-300 leading-relaxed">
          💡 创建房间后将获得6位房间号，分享给局域网内的小伙伴即可一起聊天
        </p>
      </div>
    </div>

    <!-- 加载面板 -->
    <div v-if="panel === 'loading'" id="loadingPanel" class="text-center py-16">
      <div class="w-12 h-12 mx-auto mb-5 border-4 border-pink-100 border-t-macaron-pink-d rounded-full animate-spin"></div>
      <p id="loadingText" class="text-sm text-gray-400">{{ loadingText }}</p>
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
      <span id="toastText">{{ toastMsg }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSocket, socketEmit } from '@/composables/useSocket';
import { setSession } from '@/utils';
import type { CreateResponse, CheckRoomResponse } from '@/types';

const router = useRouter();

const nickname = ref('');
const roomId = ref('');
const joinVisible = ref(false);
const panel = ref<'home' | 'loading'>('home');
const loadingText = ref('正在进入房间...');
const toastVisible = ref(false);
const toastMsg = ref('');
let toastTimer: ReturnType<typeof setTimeout> | null = null;

const socket = useSocket();

function showToast(msg: string, duration = 3000) {
  toastMsg.value = msg;
  toastVisible.value = true;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastVisible.value = false;
  }, duration);
}

function toggleJoin() {
  joinVisible.value = !joinVisible.value;
}

async function onCreate() {
  const name = nickname.value.trim();
  if (name.length < 2) {
    showToast('昵称至少2个字符');
    return;
  }
  panel.value = 'loading';
  loadingText.value = '正在创建房间...';

  try {
    const res = await socketEmit<CreateResponse>(socket, 'create-room', { nickname: name });
    if (res.error) {
      panel.value = 'home';
      showToast(res.error);
      return;
    }
    setSession({
      roomId: res.roomId,
      nickname: res.nickname,
      action: 'created'
    });
    router.push(`/room?room=${res.roomId}`);
  } catch {
    panel.value = 'home';
    showToast('连接服务器失败，请确认服务已启动');
  }
}

async function onJoin() {
  const name = nickname.value.trim();
  const rid = roomId.value.trim();

  if (name.length < 2) {
    showToast('昵称至少2个字符');
    return;
  }
  if (rid.length !== 6) {
    showToast('请输入6位房间号');
    return;
  }

  panel.value = 'loading';
  loadingText.value = '正在加入房间...';

  try {
    const res = await socketEmit<CheckRoomResponse>(socket, 'check-room', {
      roomId: rid,
      nickname: name
    });
    if (res.error) {
      panel.value = 'home';
      showToast(res.error);
      return;
    }
    setSession({
      roomId: res.roomId,
      nickname: res.nickname,
      action: 'joined'
    });
    router.push(`/room?room=${res.roomId}`);
  } catch {
    panel.value = 'home';
    showToast('连接服务器失败，请确认服务已启动');
  }
}

onMounted(() => {
  // 处理URL参数中的房间号（分享链接进入）
  const urlParams = new URLSearchParams(window.location.search);
  const urlRoomId = urlParams.get('room');
  if (urlRoomId && urlRoomId.length === 6) {
    roomId.value = urlRoomId.toUpperCase();
    joinVisible.value = true;
  }
});

onUnmounted(() => {
  if (toastTimer) clearTimeout(toastTimer);
  socket.disconnect();
});
</script>

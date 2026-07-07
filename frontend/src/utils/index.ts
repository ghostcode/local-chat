import type { SessionData } from '@/types';

const avatarColors = [
  '#F8B4C8', '#FCCB9F', '#B5EAD7', '#B5D8EB',
  '#C7CEEA', '#E2C6FF', '#FFD1DC', '#A8D8EA'
];

export function getUserColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export function getLocalUrl(): string {
  return window.location.origin;
}

export function getSession(): SessionData | null {
  try {
    const stored = sessionStorage.getItem('lanChat');
    return stored ? (JSON.parse(stored) as SessionData) : null;
  } catch {
    return null;
  }
}

export function setSession(data: SessionData): void {
  sessionStorage.setItem('lanChat', JSON.stringify(data));
}

export function clearSession(): void {
  sessionStorage.removeItem('lanChat');
}

export function updateSessionAction(action: 'created' | 'joined'): void {
  const stored = getSession();
  if (stored) {
    stored.action = action;
    setSession(stored);
  }
}

export async function copyToClipboard(text: string, showToast: (msg: string) => void): Promise<void> {
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

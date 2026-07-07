import { io, type Socket } from 'socket.io-client';

export type AppSocket = Socket;

export function useSocket(): AppSocket {
  return io();
}

export function socketEmit<T = unknown>(
  socket: AppSocket,
  event: string,
  ...args: unknown[]
): Promise<T> {
  return new Promise((resolve) => {
    (socket.emit as (...args: unknown[]) => void)(event, ...args, (res: T) => {
      resolve(res);
    });
  });
}

export function sendMessage(socket: AppSocket, text: string): void {
  socket.emit('send-message', { text });
}

export function sendImage(socket: AppSocket, image: string): void {
  socket.emit('send-image', { image });
}

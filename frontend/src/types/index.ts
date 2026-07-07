export interface ChatMessage {
  id?: string;
  nickname: string;
  text?: string;
  image?: string;
  time: string;
  timestamp?: number;
}

export interface SystemMessage {
  text: string;
  time: string;
}

export interface RoomInfo {
  roomId: string;
  users: string[];
  creator: string;
  messageCount: number;
}

export interface JoinResponse {
  success: boolean;
  roomId: string;
  nickname: string;
  messages: ChatMessage[];
  creator: string;
  error?: string;
}

export interface CreateResponse {
  success: boolean;
  roomId: string;
  nickname: string;
  error?: string;
}

export interface CheckRoomResponse {
  success: boolean;
  roomId: string;
  nickname: string;
  error?: string;
}

export interface SessionData {
  roomId: string;
  nickname: string;
  action: 'created' | 'joined';
}

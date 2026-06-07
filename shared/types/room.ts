export enum RoomStatus {
  WAITING = 'WAITING',     // Waiting for players
  IN_GAME = 'IN_GAME',     // Game in progress
  FINISHED = 'FINISHED',   // Game completed
}

export interface RoomSettings {
  maxPlayers: number;       // 2-10
  isPublic: boolean;
  allowSpectators: boolean;
  autoStart: boolean;       // Start when room is full
}

export interface RoomPlayer {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isReady: boolean;
  isConnected: boolean;
  seatIndex: number;
}

export interface Room {
  roomCode: string;
  hostId: string;
  status: RoomStatus;
  settings: RoomSettings;
  players: RoomPlayer[];
  spectators: string[];
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  message: string;
  timestamp: string;
}

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  maxPlayers: 4,
  isPublic: false,
  allowSpectators: true,
  autoStart: false,
};

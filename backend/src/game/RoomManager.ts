import { Room, RoomStatus, RoomSettings, RoomPlayer, ChatMessage, DEFAULT_ROOM_SETTINGS } from '../../../shared/types/room';
import { GameEngine } from './GameEngine';
import { generateRoomCode } from '../utils/roomCode';
import { logger } from '../utils/logger';
import { MIN_PLAYERS, MAX_PLAYERS, ROOM_CLEANUP_TIMEOUT_MS } from '../../../shared/constants';
import { v4 as uuidv4 } from 'uuid';

interface ManagedRoom {
  room: Room;
  game: GameEngine | null;
  socketMap: Map<string, string>; // userId → socketId
  cleanupTimer: NodeJS.Timeout | null;
  chatHistory: ChatMessage[];
}

export class RoomManager {
  private rooms: Map<string, ManagedRoom> = new Map(); // roomCode → ManagedRoom
  private userRooms: Map<string, string> = new Map();   // userId → roomCode

  createRoom(userId: string, userName: string, userAvatar: string, settings?: Partial<RoomSettings>): Room {
    const existingRoomCode = this.userRooms.get(userId);
    if (existingRoomCode && this.rooms.has(existingRoomCode)) {
      throw new Error('You are already in a room');
    }

    const roomCode = this.generateUniqueCode();

    const roomSettings: RoomSettings = {
      ...DEFAULT_ROOM_SETTINGS,
      ...settings,
      maxPlayers: Math.min(Math.max(settings?.maxPlayers || DEFAULT_ROOM_SETTINGS.maxPlayers, MIN_PLAYERS), MAX_PLAYERS),
    };

    const host: RoomPlayer = {
      id: userId,
      name: userName,
      avatar: userAvatar,
      isHost: true,
      isReady: true,
      isConnected: true,
      seatIndex: 0,
    };

    const room: Room = {
      roomCode,
      hostId: userId,
      status: RoomStatus.WAITING,
      settings: roomSettings,
      players: [host],
      spectators: [],
      createdAt: new Date().toISOString(),
    };

    this.rooms.set(roomCode, {
      room,
      game: null,
      socketMap: new Map(),
      cleanupTimer: null,
      chatHistory: [],
    });

    this.userRooms.set(userId, roomCode);
    logger.info(`Room ${roomCode} created by ${userName}`);

    return room;
  }

  joinRoom(roomCode: string, userId: string, userName: string, userAvatar: string): { success: boolean; room?: Room; existingRoom?: Room; error?: string } {
    const existingRoomCode = this.userRooms.get(userId);
    if (existingRoomCode && existingRoomCode !== roomCode && this.rooms.has(existingRoomCode)) {
      return {
        success: false,
        error: 'You are already in another room',
        existingRoom: this.rooms.get(existingRoomCode)!.room,
      };
    }

    const managed = this.rooms.get(roomCode);
    if (!managed) {
      return { success: false, error: 'Room not found' };
    }

    const { room } = managed;
    if (managed.cleanupTimer) {
      clearTimeout(managed.cleanupTimer);
      managed.cleanupTimer = null;
    }

    // Check if player is already in the room (reconnect)
    const existingPlayer = room.players.find(p => p.id === userId);
    if (existingPlayer) {
      existingPlayer.name = userName;
      existingPlayer.avatar = userAvatar;
      existingPlayer.isConnected = true;
      managed.game?.setPlayerConnected(userId, true);
      this.userRooms.set(userId, roomCode);
      return { success: true, room };
    }

    if (room.status === RoomStatus.IN_GAME) {
      return { success: false, error: 'Game already in progress' };
    }

    if (room.players.length >= room.settings.maxPlayers) {
      return { success: false, error: 'Room is full' };
    }

    const newPlayer: RoomPlayer = {
      id: userId,
      name: userName,
      avatar: userAvatar,
      isHost: false,
      isReady: false,
      isConnected: true,
      seatIndex: room.players.length,
    };

    room.players.push(newPlayer);
    this.userRooms.set(userId, roomCode);

    logger.info(`${userName} joined room ${roomCode} (${room.players.length}/${room.settings.maxPlayers})`);

    return { success: true, room };
  }

  leaveRoom(userId: string): { roomCode: string; room: Room | null; isEmpty: boolean } | null {
    const roomCode = this.userRooms.get(userId);
    if (!roomCode) return null;

    const managed = this.rooms.get(roomCode);
    if (!managed) return null;

    const { room } = managed;
    const playerIndex = room.players.findIndex(p => p.id === userId);

    if (playerIndex === -1) return null;

    const player = room.players[playerIndex];
    logger.info(`${player.name} left room ${roomCode}`);

    if (room.status === RoomStatus.IN_GAME) {
      // During game: mark disconnected, don't remove
      player.isConnected = false;
      if (managed.game) {
        managed.game.setPlayerConnected(userId, false);
      }
      this.userRooms.delete(userId);
      managed.socketMap.delete(userId);
      return { roomCode, room, isEmpty: false };
    }

    // In waiting room: remove player
    room.players.splice(playerIndex, 1);
    this.userRooms.delete(userId);
    managed.socketMap.delete(userId);

    // Re-assign seats
    room.players.forEach((p, i) => { p.seatIndex = i; });

    // If host left, assign new host
    if (room.hostId === userId && room.players.length > 0) {
      room.hostId = room.players[0].id;
      room.players[0].isHost = true;
    }

    const isEmpty = room.players.length === 0;
    if (isEmpty) {
      this.scheduleCleanup(roomCode);
    }

    return { roomCode, room: isEmpty ? null : room, isEmpty };
  }

  disconnectUser(userId: string): { roomCode: string; room: Room; player: RoomPlayer; gameInProgress: boolean } | null {
    const roomCode = this.userRooms.get(userId);
    if (!roomCode) return null;

    const managed = this.rooms.get(roomCode);
    if (!managed) return null;

    const player = managed.room.players.find(p => p.id === userId);
    if (!player) return null;

    player.isConnected = false;
    managed.game?.setPlayerConnected(userId, false);
    managed.socketMap.delete(userId);

    if (managed.room.players.every(p => !p.isConnected)) {
      this.scheduleCleanup(roomCode);
    }

    logger.info(`${player.name} disconnected from room ${roomCode}`);

    return {
      roomCode,
      room: managed.room,
      player,
      gameInProgress: managed.room.status === RoomStatus.IN_GAME,
    };
  }

  startGame(roomCode: string, userId: string): { success: boolean; game?: GameEngine; error?: string } {
    const managed = this.rooms.get(roomCode);
    if (!managed) return { success: false, error: 'Room not found' };

    const { room } = managed;

    if (room.hostId !== userId) {
      return { success: false, error: 'Only the host can start the game' };
    }

    if (room.players.length < MIN_PLAYERS) {
      return { success: false, error: `Need at least ${MIN_PLAYERS} players` };
    }

    if (room.players.some(player => !player.isConnected)) {
      return { success: false, error: 'All seated players must be connected before starting' };
    }

    if (room.status === RoomStatus.IN_GAME) {
      return { success: false, error: 'Game already in progress' };
    }

    const gameId = uuidv4();
    const gamePlayers = room.players.map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      email: '', // Email not needed for game logic
    }));

    const game = new GameEngine(gameId, roomCode, gamePlayers);
    game.startGame();

    managed.game = game;
    room.status = RoomStatus.IN_GAME;

    logger.info(`Game started in room ${roomCode} with ${room.players.length} players`);

    return { success: true, game };
  }

  // ─── Socket Mapping ────────────────────────────────────────────────

  setSocket(roomCode: string, userId: string, socketId: string): void {
    const managed = this.rooms.get(roomCode);
    if (managed) {
      managed.socketMap.set(userId, socketId);
    }
  }

  getSocketId(roomCode: string, userId: string): string | undefined {
    return this.rooms.get(roomCode)?.socketMap.get(userId);
  }

  // ─── Chat ──────────────────────────────────────────────────────────

  addMessage(roomCode: string, senderId: string, senderName: string, senderAvatar: string, message: string): ChatMessage | null {
    const managed = this.rooms.get(roomCode);
    if (!managed) return null;

    const chatMsg: ChatMessage = {
      id: uuidv4(),
      senderId,
      senderName,
      senderAvatar,
      message,
      timestamp: new Date().toISOString(),
    };

    managed.chatHistory.push(chatMsg);
    // Keep last 100 messages
    if (managed.chatHistory.length > 100) {
      managed.chatHistory = managed.chatHistory.slice(-100);
    }

    return chatMsg;
  }

  getChatHistory(roomCode: string): ChatMessage[] {
    return this.rooms.get(roomCode)?.chatHistory || [];
  }

  // ─── Getters ───────────────────────────────────────────────────────

  getRoom(roomCode: string): Room | null {
    return this.rooms.get(roomCode)?.room || null;
  }

  getGame(roomCode: string): GameEngine | null {
    return this.rooms.get(roomCode)?.game || null;
  }

  getUserRoom(userId: string): string | undefined {
    return this.userRooms.get(userId);
  }

  getManaged(roomCode: string): ManagedRoom | undefined {
    return this.rooms.get(roomCode);
  }

  // ─── Room Settings ─────────────────────────────────────────────────

  updateSettings(roomCode: string, userId: string, settings: Partial<RoomSettings>): { success: boolean; error?: string } {
    const managed = this.rooms.get(roomCode);
    if (!managed) return { success: false, error: 'Room not found' };
    if (managed.room.hostId !== userId) return { success: false, error: 'Only host can change settings' };
    if (managed.room.status !== RoomStatus.WAITING) return { success: false, error: 'Cannot change settings during game' };

    managed.room.settings = { ...managed.room.settings, ...settings };
    return { success: true };
  }

  kickPlayer(roomCode: string, hostId: string, targetId: string): { success: boolean; error?: string } {
    const managed = this.rooms.get(roomCode);
    if (!managed) return { success: false, error: 'Room not found' };
    if (managed.room.hostId !== hostId) return { success: false, error: 'Only host can kick' };
    if (hostId === targetId) return { success: false, error: 'Cannot kick yourself' };

    this.leaveRoom(targetId);
    return { success: true };
  }

  // ─── Cleanup ───────────────────────────────────────────────────────

  private generateUniqueCode(): string {
    let code: string;
    let attempts = 0;
    do {
      code = generateRoomCode();
      attempts++;
      if (attempts >= 100) {
        throw new Error('Unable to generate a unique room code');
      }
    } while (this.rooms.has(code));
    return code;
  }

  private scheduleCleanup(roomCode: string): void {
    const managed = this.rooms.get(roomCode);
    if (!managed) return;

    if (managed.cleanupTimer) clearTimeout(managed.cleanupTimer);

    managed.cleanupTimer = setTimeout(() => {
      for (const player of managed.room.players) {
        this.userRooms.delete(player.id);
      }
      this.rooms.delete(roomCode);
      logger.info(`Room ${roomCode} cleaned up (empty)`);
    }, ROOM_CLEANUP_TIMEOUT_MS);
    managed.cleanupTimer.unref?.();
  }

  cleanupFinishedGame(roomCode: string): void {
    const managed = this.rooms.get(roomCode);
    if (managed) {
      managed.room.status = RoomStatus.FINISHED;
      managed.game = null;
      // Clean up user mappings
      for (const player of managed.room.players) {
        this.userRooms.delete(player.id);
      }
      this.scheduleCleanup(roomCode);
    }
  }
}

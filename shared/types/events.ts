import { Card, PlayedCard } from './card';
import { ClientGameState, FinalStanding } from './game';
import { ChatMessage, Room, RoomSettings } from './room';

// ─── Socket Event Names ─────────────────────────────────────────────

export const ClientEvents = {
  // Room events
  CREATE_ROOM: 'room:create',
  JOIN_ROOM: 'room:join',
  LEAVE_ROOM: 'room:leave',
  UPDATE_SETTINGS: 'room:settings',
  START_GAME: 'room:start',
  KICK_PLAYER: 'room:kick',

  // Game events
  PLACE_BID: 'game:bid',
  PLAY_CARD: 'game:play',

  // Chat events
  SEND_MESSAGE: 'chat:send',

  // Connection events
  RECONNECT_GAME: 'game:reconnect',
} as const;

export const ServerEvents = {
  // Room events
  ROOM_CREATED: 'room:created',
  ROOM_UPDATED: 'room:updated',
  ROOM_CONFLICT: 'room:conflict',
  PLAYER_JOINED: 'room:playerJoined',
  PLAYER_LEFT: 'room:playerLeft',
  PLAYER_KICKED: 'room:playerKicked',

  // Game events
  GAME_STARTED: 'game:started',
  GAME_STATE_UPDATE: 'game:stateUpdate',
  DEALING_CARDS: 'game:dealing',
  BID_PLACED: 'game:bidPlaced',
  CARD_PLAYED: 'game:cardPlayed',
  TRICK_COMPLETE: 'game:trickComplete',
  ROUND_COMPLETE: 'game:roundComplete',
  GAME_OVER: 'game:gameOver',

  // Chat events
  NEW_MESSAGE: 'chat:message',

  // Connection events
  PLAYER_DISCONNECTED: 'game:playerDisconnected',
  PLAYER_RECONNECTED: 'game:playerReconnected',

  // Error events
  ERROR: 'error',
} as const;

// ─── Client → Server Payloads ───────────────────────────────────────

export interface CreateRoomPayload {
  settings: RoomSettings;
}

export interface JoinRoomPayload {
  roomCode: string;
}

export interface PlaceBidPayload {
  bid: number;
}

export interface PlayCardPayload {
  cardId: string;
}

export interface SendMessagePayload {
  message: string;
}

export interface UpdateSettingsPayload {
  settings: Partial<RoomSettings>;
}

export interface KickPlayerPayload {
  playerId: string;
}

export interface ReconnectPayload {
  roomCode: string;
}

// ─── Server → Client Payloads ───────────────────────────────────────

export interface RoomCreatedPayload {
  room: Room;
}

export interface RoomUpdatedPayload {
  room: Room;
}

export interface RoomConflictPayload {
  existingRoom: Room;
  attemptedRoomCode?: string;
  action: 'create' | 'join';
}

export interface PlayerJoinedPayload {
  playerId: string;
  playerName: string;
  playerAvatar: string;
  room: Room;
}

export interface PlayerLeftPayload {
  playerId: string;
  room: Room;
}

export interface GameStateUpdatePayload {
  state: ClientGameState;
}

export interface DealingCardsPayload {
  roundNumber: number;
  cardsPerPlayer: number;
  dealerName: string;
}

export interface BidPlacedPayload {
  playerId: string;
  playerName: string;
  bid: number;
}

export interface CardPlayedPayload {
  playerId: string;
  playerName: string;
  card: Card;
}

export interface TrickCompletePayload {
  winnerId: string;
  winnerName: string;
  trickNumber: number;
  playedCards: PlayedCard[];
  winningCard: Card;
}

export interface RoundCompletePayload {
  roundNumber: number;
  scores: Record<string, { bid: number; tricksWon: number; roundScore: number; totalScore: number }>;
}

export interface GameOverPayload {
  standings: FinalStanding[];
  gameId: string;
}

export interface PlayerDisconnectedPayload {
  playerId: string;
  playerName: string;
}

export interface PlayerReconnectedPayload {
  playerId: string;
  playerName: string;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

export interface NewMessagePayload {
  message: ChatMessage;
}

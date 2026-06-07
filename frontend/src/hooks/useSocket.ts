import { useEffect, useCallback } from 'react';
import { getSocket } from '../services/socket';
import { useGameStore } from '../stores/gameStore';
import { useAuthStore } from '../stores/authStore';
import { ServerEvents, ClientEvents } from '@shared/types/events';
import type {
  RoomCreatedPayload, RoomUpdatedPayload, PlayerJoinedPayload, PlayerLeftPayload,
  GameStateUpdatePayload, BidPlacedPayload,
  TrickCompletePayload, RoundCompletePayload, GameOverPayload,
  PlayerDisconnectedPayload, PlayerReconnectedPayload, ErrorPayload,
  NewMessagePayload,
  CreateRoomPayload, JoinRoomPayload, PlaceBidPayload, PlayCardPayload,
  SendMessagePayload, UpdateSettingsPayload,
  RoomConflictPayload,
} from '@shared/types/events';
import type { RoomSettings } from '@shared/types/room';

/**
 * useSocketListeners — registers ALL server→client event handlers.
 * Call this EXACTLY ONCE at the top of the component tree (App.tsx).
 * Never call this from page components.
 */
export function useSocketListeners() {
  const {
    setRoom, setGameState, setStandings, setShowGameOver,
    addMessage, addToast, setView, setRoomConflict, setTrickCelebration, setRoundSummary,
  } = useGameStore();

  // isAuthenticated gates first setup; socketRevision moves handlers to a
  // fresh socket after login/session restore/display-name reconnects.
  const { isAuthenticated, socketRevision } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    let socket: ReturnType<typeof getSocket>;
    try {
      socket = getSocket();
    } catch {
      // Socket not ready yet — will retry when auth/socket state changes.
      return;
    }

    // ── Room events ──────────────────────────────────────────────────

    const onRoomCreated = (data: RoomCreatedPayload) => {
      setRoom(data.room);
      setView('room');
      addToast('success', `Room ${data.room.roomCode} created!`);
    };

    const onRoomUpdated = (data: RoomUpdatedPayload) => {
      setRoom(data.room);
      setRoomConflict(null);
      // Navigate the joining player from dashboard → lobby
      if (useGameStore.getState().currentView === 'dashboard') {
        setView('room');
      }
    };

    const onRoomConflict = (data: RoomConflictPayload) => {
      setRoomConflict(data);
      addToast('info', `You are already seated in room ${data.existingRoom.roomCode}`);
    };

    const onPlayerJoined = (data: PlayerJoinedPayload) => {
      setRoom(data.room);
      addToast('info', `${data.playerName} joined`);
      // Handles edge case if the current player somehow got to dashboard
      if (useGameStore.getState().currentView === 'dashboard') {
        setView('room');
      }
    };

    const onPlayerLeft = (data: PlayerLeftPayload) => {
      // data.room can be null if room is now empty
      if (data.room) setRoom(data.room);
    };

    const onPlayerKicked = () => {
      setRoom(null);
      setView('dashboard');
      addToast('error', 'You were kicked from the room');
    };

    // ── Game events ──────────────────────────────────────────────────

    const onGameStateUpdate = (data: GameStateUpdatePayload) => {
      setGameState(data.state);
      if (useGameStore.getState().currentView !== 'game') {
        setView('game');
      }
    };

    const onBidPlaced = (data: BidPlacedPayload) => {
      addToast('info', `${data.playerName} bid ${data.bid}`);
    };

    const onTrickComplete = (data: TrickCompletePayload) => {
      setTrickCelebration(data);
      addToast('success', `${data.winnerName} wins trick ${data.trickNumber}!`);
    };

    const onRoundComplete = (data: RoundCompletePayload) => {
      setRoundSummary(data);
      addToast('info', `Round ${data.roundNumber} complete!`);
    };

    const onGameOver = (data: GameOverPayload) => {
      setStandings(data.standings);
      setShowGameOver(true);
    };

    // ── Chat ─────────────────────────────────────────────────────────

    const onNewMessage = (data: NewMessagePayload) => {
      addMessage(data.message);
    };

    // ── Presence ─────────────────────────────────────────────────────

    const onPlayerDisconnected = (data: PlayerDisconnectedPayload) => {
      addToast('error', `${data.playerName} disconnected`);
    };

    const onPlayerReconnected = (data: PlayerReconnectedPayload) => {
      addToast('success', `${data.playerName} reconnected`);
    };

    // ── Errors ───────────────────────────────────────────────────────

    const onError = (data: ErrorPayload) => {
      addToast('error', data.message);
    };

    // Register all handlers
    socket.on(ServerEvents.ROOM_CREATED, onRoomCreated);
    socket.on(ServerEvents.ROOM_UPDATED, onRoomUpdated);
    socket.on(ServerEvents.ROOM_CONFLICT, onRoomConflict);
    socket.on(ServerEvents.PLAYER_JOINED, onPlayerJoined);
    socket.on(ServerEvents.PLAYER_LEFT, onPlayerLeft);
    socket.on(ServerEvents.PLAYER_KICKED, onPlayerKicked);
    socket.on(ServerEvents.GAME_STATE_UPDATE, onGameStateUpdate);
    socket.on(ServerEvents.BID_PLACED, onBidPlaced);
    socket.on(ServerEvents.TRICK_COMPLETE, onTrickComplete);
    socket.on(ServerEvents.ROUND_COMPLETE, onRoundComplete);
    socket.on(ServerEvents.GAME_OVER, onGameOver);
    socket.on(ServerEvents.NEW_MESSAGE, onNewMessage);
    socket.on(ServerEvents.PLAYER_DISCONNECTED, onPlayerDisconnected);
    socket.on(ServerEvents.PLAYER_RECONNECTED, onPlayerReconnected);
    socket.on(ServerEvents.ERROR, onError);

    const activeRoomCode = localStorage.getItem('activeRoomCode');
    if (activeRoomCode) {
      socket.emit(ClientEvents.RECONNECT_GAME, { roomCode: activeRoomCode });
    }

    return () => {
      // Remove only the specific handler instances — no "nuke all" off()
      socket.off(ServerEvents.ROOM_CREATED, onRoomCreated);
      socket.off(ServerEvents.ROOM_UPDATED, onRoomUpdated);
      socket.off(ServerEvents.ROOM_CONFLICT, onRoomConflict);
      socket.off(ServerEvents.PLAYER_JOINED, onPlayerJoined);
      socket.off(ServerEvents.PLAYER_LEFT, onPlayerLeft);
      socket.off(ServerEvents.PLAYER_KICKED, onPlayerKicked);
      socket.off(ServerEvents.GAME_STATE_UPDATE, onGameStateUpdate);
      socket.off(ServerEvents.BID_PLACED, onBidPlaced);
      socket.off(ServerEvents.TRICK_COMPLETE, onTrickComplete);
      socket.off(ServerEvents.ROUND_COMPLETE, onRoundComplete);
      socket.off(ServerEvents.GAME_OVER, onGameOver);
      socket.off(ServerEvents.NEW_MESSAGE, onNewMessage);
      socket.off(ServerEvents.PLAYER_DISCONNECTED, onPlayerDisconnected);
      socket.off(ServerEvents.PLAYER_RECONNECTED, onPlayerReconnected);
      socket.off(ServerEvents.ERROR, onError);
    };
  }, [isAuthenticated, socketRevision]); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * useSocketActions — provides emit helpers only, no event listeners.
 * Safe to call from any page/component.
 */
export function useSocketActions() {
  const { setRoom, setGameState, setView } = useGameStore();

  const createRoom = useCallback((settings: Partial<RoomSettings> = {}) => {
    const socket = getSocket();
    socket.emit(ClientEvents.CREATE_ROOM, { settings } as CreateRoomPayload);
  }, []);

  const joinRoom = useCallback((roomCode: string) => {
    const socket = getSocket();
    socket.emit(ClientEvents.JOIN_ROOM, { roomCode } as JoinRoomPayload);
  }, []);

  const leaveRoom = useCallback(() => {
    const socket = getSocket();
    socket.emit(ClientEvents.LEAVE_ROOM);
    // Optimistic local reset — server will confirm via PLAYER_LEFT
    setRoom(null);
    setGameState(null);
    setView('dashboard');
  }, [setRoom, setGameState, setView]);

  const startGame = useCallback(() => {
    const socket = getSocket();
    socket.emit(ClientEvents.START_GAME);
  }, []);

  const placeBid = useCallback((bid: number) => {
    const socket = getSocket();
    socket.emit(ClientEvents.PLACE_BID, { bid } as PlaceBidPayload);
  }, []);

  const playCard = useCallback((cardId: string) => {
    const socket = getSocket();
    socket.emit(ClientEvents.PLAY_CARD, { cardId } as PlayCardPayload);
  }, []);

  const sendMessage = useCallback((message: string) => {
    const socket = getSocket();
    socket.emit(ClientEvents.SEND_MESSAGE, { message } as SendMessagePayload);
  }, []);

  const updateSettings = useCallback((settings: Partial<RoomSettings>) => {
    const socket = getSocket();
    socket.emit(ClientEvents.UPDATE_SETTINGS, { settings } as UpdateSettingsPayload);
  }, []);

  const reconnectGame = useCallback((roomCode: string) => {
    const socket = getSocket();
    socket.emit(ClientEvents.RECONNECT_GAME, { roomCode });
  }, []);

  return {
    createRoom, joinRoom, leaveRoom, startGame,
    placeBid, playCard, sendMessage, updateSettings, reconnectGame,
  };
}

/**
 * @deprecated Use useSocketActions() in pages, and useSocketListeners() only in App.tsx.
 * This backwards-compat shim provides actions only (no listeners).
 */
export function useSocket() {
  return useSocketActions();
}

import { create } from 'zustand';
import { ClientGameState, RoundScore } from '@shared/types/game';
import { Room, ChatMessage } from '@shared/types/room';
import { FinalStanding } from '@shared/types/game';
import { Card, PlayedCard } from '@shared/types/card';

interface RoomConflictState {
  existingRoom: Room;
  attemptedRoomCode?: string;
  action: 'create' | 'join';
}

interface TrickCelebrationState {
  winnerId: string;
  winnerName: string;
  trickNumber: number;
  playedCards: PlayedCard[];
  winningCard: Card;
}

interface RoundSummaryState {
  roundNumber: number;
  scores: Record<string, RoundScore>;
}

type ViewState = 'login' | 'onboarding' | 'dashboard' | 'lobby' | 'room' | 'game';

interface GameStore {
  // Navigation
  currentView: ViewState;
  setView: (view: ViewState) => void;

  // Room state
  room: Room | null;
  setRoom: (room: Room | null) => void;
  roomConflict: RoomConflictState | null;
  setRoomConflict: (conflict: RoomConflictState | null) => void;

  // Game state
  gameState: ClientGameState | null;
  setGameState: (state: ClientGameState | null) => void;
  trickCelebration: TrickCelebrationState | null;
  setTrickCelebration: (celebration: TrickCelebrationState | null) => void;
  roundSummary: RoundSummaryState | null;
  setRoundSummary: (summary: RoundSummaryState | null) => void;

  // Game over
  standings: FinalStanding[] | null;
  setStandings: (standings: FinalStanding[] | null) => void;
  showGameOver: boolean;
  setShowGameOver: (show: boolean) => void;

  // Chat
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;

  // UI state
  toasts: Array<{ id: string; type: 'success' | 'error' | 'info'; message: string }>;
  addToast: (type: 'success' | 'error' | 'info', message: string) => void;
  removeToast: (id: string) => void;

  // Theme
  theme: 'dark' | 'light';
  toggleTheme: () => void;

  // Reset
  resetGame: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  currentView: 'login',
  setView: (view) => set({ currentView: view }),

  room: null,
  setRoom: (room) => {
    if (room) {
      localStorage.setItem('activeRoomCode', room.roomCode);
    } else {
      localStorage.removeItem('activeRoomCode');
    }
    set({ room });
  },
  roomConflict: null,
  setRoomConflict: (conflict) => set({ roomConflict: conflict }),

  gameState: null,
  setGameState: (state) => {
    if (state) {
      localStorage.setItem('activeRoomCode', state.roomCode);
    }
    set({ gameState: state });
  },
  trickCelebration: null,
  setTrickCelebration: (celebration) => set({ trickCelebration: celebration }),
  roundSummary: null,
  setRoundSummary: (summary) => set({ roundSummary: summary }),

  standings: null,
  setStandings: (standings) => set({ standings }),
  showGameOver: false,
  setShowGameOver: (show) => set({ showGameOver: show }),

  messages: [],
  addMessage: (message) => set((s) => ({
    messages: [...s.messages.slice(-99), message],
  })),
  clearMessages: () => set({ messages: [] }),

  toasts: [],
  addToast: (type, message) => {
    const id = Date.now().toString();
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
    setTimeout(() => get().removeToast(id), 4000);
  },
  removeToast: (id) => set((s) => ({
    toasts: s.toasts.filter(t => t.id !== id),
  })),

  theme: (localStorage.getItem('theme') as 'dark' | 'light') || 'dark',
  toggleTheme: () => {
    const newTheme = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    set({ theme: newTheme });
  },

  resetGame: () => {
    localStorage.removeItem('activeRoomCode');
    set({
      room: null,
      roomConflict: null,
      gameState: null,
      trickCelebration: null,
      roundSummary: null,
      standings: null,
      showGameOver: false,
      messages: [],
      currentView: 'dashboard',
    });
  },
}));

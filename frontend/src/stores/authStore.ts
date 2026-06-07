import { create } from 'zustand';
import { api } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  gamesPlayed: number;
  gamesWon: number;
  highestScore: number;
  totalPoints: number;
  displayNameConfirmed: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  socketRevision: number;

  login: (credential: string) => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  logout: () => void;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  isLoading: true,
  socketRevision: 0,

  login: async (credential: string) => {
    try {
      const { token, user } = await api.googleLogin(credential);
      localStorage.setItem('token', token);
      connectSocket(token);
      set((state) => ({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        socketRevision: state.socketRevision + 1,
      }));
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },

  updateDisplayName: async (name: string) => {
    const { user } = await api.updateDisplayName(name);
    const token = localStorage.getItem('token');
    if (token) {
      disconnectSocket();
      connectSocket(token);
    }
    set((state) => ({
      user,
      isAuthenticated: true,
      isLoading: false,
      socketRevision: token ? state.socketRevision + 1 : state.socketRevision,
    }));
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('activeRoomCode');
    disconnectSocket();
    set((state) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      socketRevision: state.socketRevision + 1,
    }));
  },

  restoreSession: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isLoading: false });
      return;
    }

    try {
      const { user } = await api.getMe();
      connectSocket(token);
      set((state) => ({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        socketRevision: state.socketRevision + 1,
      }));
    } catch {
      localStorage.removeItem('token');
      set((state) => ({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        socketRevision: state.socketRevision + 1,
      }));
    }
  },
}));

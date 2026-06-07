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

  login: async (credential: string) => {
    try {
      const { token, user } = await api.googleLogin(credential);
      localStorage.setItem('token', token);
      connectSocket(token);
      set({ user, token, isAuthenticated: true, isLoading: false });
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
    set({ user, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('activeRoomCode');
    disconnectSocket();
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
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
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem('token');
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },
}));

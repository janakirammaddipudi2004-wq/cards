import { API_URL } from './config';

export interface ApiUser {
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

export interface LeaderboardEntry {
  id: string;
  name: string;
  avatar: string;
  games_played: number;
  games_won: number;
  highest_score: number;
  total_points: number;
  win_rate: number;
}

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

export const api = {
  async googleLogin(credential: string) {
    const res = await fetch(`${API_URL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    });
    return handleResponse<{ token: string; user: ApiUser }>(res);
  },

  async getMe() {
    const res = await fetch(`${API_URL}/auth/me`, { headers: getHeaders() });
    return handleResponse<{ user: ApiUser }>(res);
  },

  async getProfile(userId?: string) {
    const path = userId ? `/users/${userId}/profile` : '/users/profile';
    const res = await fetch(`${API_URL}${path}`, { headers: getHeaders() });
    return handleResponse<{ profile: unknown }>(res);
  },

  async getLeaderboard() {
    const res = await fetch(`${API_URL}/games/leaderboard`, { headers: getHeaders() });
    return handleResponse<{ leaderboard: LeaderboardEntry[] }>(res);
  },

  async getGameDetails(gameId: string) {
    const res = await fetch(`${API_URL}/games/${gameId}`, { headers: getHeaders() });
    return handleResponse<{ game: unknown }>(res);
  },

  async updateDisplayName(name: string) {
    const res = await fetch(`${API_URL}/users/profile/name`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ name }),
    });
    return handleResponse<{ user: ApiUser }>(res);
  },
};

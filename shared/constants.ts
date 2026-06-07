// Game constants
export const TOTAL_ROUNDS = 13;
export const NUM_DECKS = 2;
export const CARDS_PER_DECK = 52;
export const TOTAL_CARDS = NUM_DECKS * CARDS_PER_DECK; // 104

// Room constants
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 10;
export const ROOM_CODE_LENGTH = 6;

// Score formula
export const CORRECT_BID_BASE = 10;
export const CORRECT_BID_MULTIPLIER = 11;
export const INCORRECT_BID_SCORE = 0;

// Reconnection
export const RECONNECT_TIMEOUT_MS = 60_000; // 1 minute to reconnect
export const RECONNECT_MAX_RETRIES = 10;

// Room auto-cleanup
export const ROOM_CLEANUP_TIMEOUT_MS = 300_000; // 5 minutes after all leave

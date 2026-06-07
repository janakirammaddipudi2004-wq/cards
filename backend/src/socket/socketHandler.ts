import { Server, Socket } from 'socket.io';
import { verifyToken } from '../middleware/auth';
import { RoomManager } from '../game/RoomManager';
import { logger } from '../utils/logger';
import {
  ClientEvents, ServerEvents,
  CreateRoomPayload, JoinRoomPayload, PlaceBidPayload, PlayCardPayload,
  SendMessagePayload, UpdateSettingsPayload, KickPlayerPayload, ReconnectPayload,
} from '../../../shared/types/events';
import { FinalStanding, GamePhase } from '../../../shared/types/game';
import { findUserById } from '../db/queries/users';
import * as gameQueries from '../db/queries/games';

const roomManager = new RoomManager();

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userName?: string;
  userAvatar?: string;
}

export function setupSocketHandlers(io: Server): void {
  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const payload = verifyToken(token);
    if (!payload) {
      return next(new Error('Invalid token'));
    }

    let user = null;
    try {
      user = await findUserById(payload.userId);
    } catch (err) {
      logger.warn('Socket authentication user lookup failed', err);
      return next(new Error('User lookup failed'));
    }

    if (!user) {
      return next(new Error('Authenticated user not found'));
    }

    socket.userId = user.id;
    socket.userName = user.name;
    socket.userAvatar = user.avatar;

    next();
  });

  io.on('connection', (rawSocket: Socket) => {
    const socket = rawSocket as AuthenticatedSocket;
    const userId = socket.userId!;
    const userName = socket.userName!;
    const userAvatar = socket.userAvatar!;

    logger.info(`Socket connected: ${userName} (${socket.id})`);

    // ─── Room Events ───────────────────────────────────────────

    socket.on(ClientEvents.CREATE_ROOM, (data: CreateRoomPayload) => {
      try {
        const existingRoomCode = roomManager.getUserRoom(userId);
        const existingRoom = existingRoomCode ? roomManager.getRoom(existingRoomCode) : null;
        if (existingRoom) {
          socket.emit(ServerEvents.ROOM_CONFLICT, {
            existingRoom,
            action: 'create',
          });
          return;
        }

        const room = roomManager.createRoom(userId, userName, userAvatar, data.settings);
        roomManager.setSocket(room.roomCode, userId, socket.id);
        socket.join(room.roomCode);
        socket.emit(ServerEvents.ROOM_CREATED, { room });
      } catch (err: any) {
        socket.emit(ServerEvents.ERROR, { code: 'CREATE_FAILED', message: err.message });
      }
    });

    socket.on(ClientEvents.JOIN_ROOM, (data: JoinRoomPayload) => {
      try {
        const result = roomManager.joinRoom(data.roomCode, userId, userName, userAvatar);
        if (!result.success) {
          if (result.existingRoom) {
            socket.emit(ServerEvents.ROOM_CONFLICT, {
              existingRoom: result.existingRoom,
              attemptedRoomCode: data.roomCode,
              action: 'join',
            });
            return;
          }

          socket.emit(ServerEvents.ERROR, { code: 'JOIN_FAILED', message: result.error });
          return;
        }

        roomManager.setSocket(data.roomCode, userId, socket.id);
        socket.join(data.roomCode);

        socket.emit(ServerEvents.ROOM_UPDATED, { room: result.room });
        socket.to(data.roomCode).emit(ServerEvents.PLAYER_JOINED, {
          playerId: userId,
          playerName: userName,
          playerAvatar: userAvatar,
          room: result.room,
        });

        // Send chat history
        const chatHistory = roomManager.getChatHistory(data.roomCode);
        for (const msg of chatHistory) {
          socket.emit(ServerEvents.NEW_MESSAGE, { message: msg });
        }

        // If game is in progress, send current state
        const game = roomManager.getGame(data.roomCode);
        if (game) {
          game.setPlayerConnected(userId, true);
          socket.emit(ServerEvents.GAME_STATE_UPDATE, { state: game.getClientState(userId) });
          socket.to(data.roomCode).emit(ServerEvents.PLAYER_RECONNECTED, {
            playerId: userId,
            playerName: userName,
          });
        }
      } catch (err: any) {
        socket.emit(ServerEvents.ERROR, { code: 'JOIN_FAILED', message: err.message });
      }
    });

    socket.on(ClientEvents.LEAVE_ROOM, () => {
      handleLeave(socket, io);
    });

    socket.on(ClientEvents.UPDATE_SETTINGS, (data: UpdateSettingsPayload) => {
      const roomCode = roomManager.getUserRoom(userId);
      if (!roomCode) return;

      const result = roomManager.updateSettings(roomCode, userId, data.settings);
      if (result.success) {
        const room = roomManager.getRoom(roomCode);
        io.to(roomCode).emit(ServerEvents.ROOM_UPDATED, { room });
      } else {
        socket.emit(ServerEvents.ERROR, { code: 'SETTINGS_FAILED', message: result.error });
      }
    });

    socket.on(ClientEvents.KICK_PLAYER, (data: KickPlayerPayload) => {
      const roomCode = roomManager.getUserRoom(userId);
      if (!roomCode) return;

      const result = roomManager.kickPlayer(roomCode, userId, data.playerId);
      if (result.success) {
        const room = roomManager.getRoom(roomCode);
        io.to(roomCode).emit(ServerEvents.PLAYER_KICKED, { playerId: data.playerId });
        io.to(roomCode).emit(ServerEvents.ROOM_UPDATED, { room });
      }
    });

    // ─── Game Events ───────────────────────────────────────────

    socket.on(ClientEvents.START_GAME, () => {
      const roomCode = roomManager.getUserRoom(userId);
      if (!roomCode) return;

      const result = roomManager.startGame(roomCode, userId);
      if (!result.success) {
        socket.emit(ServerEvents.ERROR, { code: 'START_FAILED', message: result.error });
        return;
      }

      const game = result.game!;

      // Save game to DB
      gameQueries.createGame(game.getFullState().gameId, roomCode, game.getPlayers().length)
        .then(async dbGameId => {
          await Promise.all(
            game.getPlayers().map(player => gameQueries.addGamePlayer(dbGameId, player.id, player.seatIndex))
          );
        })
        .catch(err => logger.error('Failed to save game to DB', err));

      // Send personalized state to each player
      const room = roomManager.getRoom(roomCode);
      if (room) {
        for (const player of room.players) {
          const socketId = roomManager.getSocketId(roomCode, player.id);
          if (socketId) {
            io.to(socketId).emit(ServerEvents.GAME_STATE_UPDATE, {
              state: game.getClientState(player.id),
            });
          }
        }
      }
    });

    socket.on(ClientEvents.PLACE_BID, (data: PlaceBidPayload) => {
      const roomCode = roomManager.getUserRoom(userId);
      if (!roomCode) return;

      const game = roomManager.getGame(roomCode);
      if (!game) return;

      const result = game.placeBid(userId, data.bid);
      if (!result.success) {
        socket.emit(ServerEvents.ERROR, { code: 'BID_FAILED', message: result.error });
        return;
      }

      // Broadcast bid placement
      io.to(roomCode).emit(ServerEvents.BID_PLACED, {
        playerId: userId,
        playerName: userName,
        bid: data.bid,
      });

      // Send updated state to all players
      broadcastGameState(io, roomCode, game);
    });

    socket.on(ClientEvents.PLAY_CARD, (data: PlayCardPayload) => {
      const roomCode = roomManager.getUserRoom(userId);
      if (!roomCode) return;

      const game = roomManager.getGame(roomCode);
      if (!game) return;

      const result = game.playCard(userId, data.cardId);
      if (!result.success) {
        socket.emit(ServerEvents.ERROR, { code: 'PLAY_FAILED', message: result.error });
        return;
      }

      // Find the played card info for broadcast
      const trick = game.getCurrentTrick();
      const lastPlayed = trick?.playedCards[trick.playedCards.length - 1] ||
                         game.getFullState().currentRound?.tricks.slice(-1)[0]?.playedCards.slice(-1)[0];

      if (lastPlayed) {
        io.to(roomCode).emit(ServerEvents.CARD_PLAYED, {
          playerId: userId,
          playerName: userName,
          card: lastPlayed.card,
        });
      }

      if (result.trickComplete) {
        const completedTrick = game.getFullState().currentRound?.tricks.slice(-1)[0];
        if (completedTrick) {
          const winnerPlayer = game.getPlayers().find(p => p.id === completedTrick.winnerId);
          const winningCard = completedTrick.playedCards.find(played => played.playerId === completedTrick.winnerId);
          io.to(roomCode).emit(ServerEvents.TRICK_COMPLETE, {
            winnerId: completedTrick.winnerId!,
            winnerName: winnerPlayer?.name || '',
            trickNumber: completedTrick.trickNumber,
            playedCards: completedTrick.playedCards,
            winningCard: winningCard?.card || completedTrick.playedCards[completedTrick.playedCards.length - 1].card,
          });
        }
      }

      if (result.roundComplete) {
        const roundHistory = game.getRoundHistory();
        const lastRound = roundHistory[roundHistory.length - 1];

        io.to(roomCode).emit(ServerEvents.ROUND_COMPLETE, {
          roundNumber: lastRound.roundNumber,
          scores: lastRound.scores,
        });

        // Save round to DB
        const fullState = game.getFullState();
        gameQueries.saveRound(
          fullState.gameId,
          lastRound.roundNumber,
          game.getDealerId(),
          game.getPlayers().map(p => ({
            userId: p.id,
            bid: lastRound.scores[p.id]?.bid || 0,
            tricksWon: lastRound.scores[p.id]?.tricksWon || 0,
            roundScore: lastRound.scores[p.id]?.roundScore || 0,
          }))
        ).catch(err => logger.error('Failed to save round', err));

        // Check if game is over
        if (game.getPhase() === GamePhase.GAME_OVER) {
          const standings = game.getFinalStandings();
          io.to(roomCode).emit(ServerEvents.GAME_OVER, {
            standings,
            gameId: fullState.gameId,
          });

          persistFinalResults(fullState.gameId, standings, roomCode);
        } else {
          // Auto-advance to next round after 3 seconds
          setTimeout(() => {
            try {
              game.advanceToNextRound();
              if (game.getPhase() === GamePhase.GAME_OVER) {
                const finalState = game.getFullState();
                const standings = game.getFinalStandings();
                io.to(roomCode).emit(ServerEvents.GAME_OVER, {
                  standings,
                  gameId: finalState.gameId,
                });
                persistFinalResults(finalState.gameId, standings, roomCode);
              } else {
                broadcastGameState(io, roomCode, game);
              }
            } catch (err) {
              logger.error('Failed to advance round', err);
            }
          }, 3000);
        }
      } else {
        broadcastGameState(io, roomCode, game);
      }
    });

    // ─── Chat Events ───────────────────────────────────────────

    socket.on(ClientEvents.SEND_MESSAGE, (data: SendMessagePayload) => {
      const roomCode = roomManager.getUserRoom(userId);
      if (!roomCode) return;

      const message = roomManager.addMessage(roomCode, userId, userName, userAvatar, data.message);
      if (message) {
        io.to(roomCode).emit(ServerEvents.NEW_MESSAGE, { message });
      }
    });

    // ─── Reconnection ──────────────────────────────────────────

    socket.on(ClientEvents.RECONNECT_GAME, (data: ReconnectPayload) => {
      const result = roomManager.joinRoom(data.roomCode, userId, userName, userAvatar);
      if (result.success) {
        roomManager.setSocket(data.roomCode, userId, socket.id);
        socket.join(data.roomCode);

        const game = roomManager.getGame(data.roomCode);
        if (game) {
          game.setPlayerConnected(userId, true);
          socket.emit(ServerEvents.GAME_STATE_UPDATE, { state: game.getClientState(userId) });
          socket.to(data.roomCode).emit(ServerEvents.PLAYER_RECONNECTED, {
            playerId: userId,
            playerName: userName,
          });
        } else {
          socket.emit(ServerEvents.ROOM_UPDATED, { room: result.room });
        }
      } else {
        socket.emit(ServerEvents.ERROR, { code: 'RECONNECT_FAILED', message: result.error });
      }
    });

    // ─── Disconnect ────────────────────────────────────────────

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${userName} (${socket.id})`);
      handleDisconnect(socket, io);
    });
  });
}

function handleLeave(socket: AuthenticatedSocket, io: Server): void {
  const userId = socket.userId!;
  const userName = socket.userName!;

  const result = roomManager.leaveRoom(userId);
  if (result) {
    socket.leave(result.roomCode);

    if (!result.isEmpty && result.room) {
      io.to(result.roomCode).emit(ServerEvents.PLAYER_LEFT, {
        playerId: userId,
        room: result.room,
      });

      // If game in progress, notify about disconnect
      const game = roomManager.getGame(result.roomCode);
      if (game) {
        io.to(result.roomCode).emit(ServerEvents.PLAYER_DISCONNECTED, {
          playerId: userId,
          playerName: userName,
        });
      }
    }
  }
}

function handleDisconnect(socket: AuthenticatedSocket, io: Server): void {
  const userId = socket.userId!;
  const result = roomManager.disconnectUser(userId);
  if (!result) return;

  io.to(result.roomCode).emit(ServerEvents.ROOM_UPDATED, {
    room: result.room,
  });

  if (result.gameInProgress) {
    io.to(result.roomCode).emit(ServerEvents.PLAYER_DISCONNECTED, {
      playerId: result.player.id,
      playerName: result.player.name,
    });
  }
}

function broadcastGameState(io: Server, roomCode: string, game: any): void {
  const room = roomManager.getRoom(roomCode);
  if (!room) return;

  for (const player of room.players) {
    const socketId = roomManager.getSocketId(roomCode, player.id);
    if (socketId) {
      io.to(socketId).emit(ServerEvents.GAME_STATE_UPDATE, {
        state: game.getClientState(player.id),
      });
    }
  }
}

function persistFinalResults(gameId: string, standings: FinalStanding[], roomCode: string): void {
  gameQueries.completeGame(
    gameId,
    standings[0].playerId,
    standings.map(s => ({
      userId: s.playerId,
      finalScore: s.totalScore,
      placement: s.placement,
    }))
  )
    .then(() => roomManager.cleanupFinishedGame(roomCode))
    .catch(err => logger.error('Failed to save final results', err));
}

export { roomManager };

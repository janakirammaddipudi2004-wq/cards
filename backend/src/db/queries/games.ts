import { pool, query } from '../../config/database';

export async function createGame(gameId: string, roomCode: string, playerCount: number): Promise<string> {
  const result = await query(
    `INSERT INTO games (id, room_code, player_count, status) VALUES ($1, $2, $3, 'active') RETURNING id`,
    [gameId, roomCode, playerCount]
  );
  return result.rows[0].id;
}

export async function addGamePlayer(gameId: string, userId: string, seatPosition: number): Promise<void> {
  await query(
    `INSERT INTO game_players (game_id, user_id, seat_position) VALUES ($1, $2, $3)
     ON CONFLICT (game_id, user_id) DO NOTHING`,
    [gameId, userId, seatPosition]
  );
}

export async function completeGame(
  gameId: string,
  winnerId: string,
  playerScores: Array<{ userId: string; finalScore: number; placement: number }>
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE games SET status = 'completed', winner_id = $1, completed_at = NOW() WHERE id = $2`,
      [winnerId, gameId]
    );

    for (const ps of playerScores) {
      await client.query(
        `UPDATE game_players SET final_score = $1, placement = $2 WHERE game_id = $3 AND user_id = $4`,
        [ps.finalScore, ps.placement, gameId, ps.userId]
      );

      await client.query(
        `UPDATE users
         SET games_played = games_played + 1,
             games_won = games_won + CASE WHEN id = $1 THEN 1 ELSE 0 END,
             highest_score = GREATEST(highest_score, $2),
             total_points = total_points + $2,
             updated_at = NOW()
         WHERE id = $3`,
        [winnerId, ps.finalScore, ps.userId]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function saveRound(
  gameId: string,
  roundNumber: number,
  dealerUserId: string,
  playerData: Array<{ userId: string; bid: number; tricksWon: number; roundScore: number }>
): Promise<void> {
  const roundResult = await query(
    `INSERT INTO rounds (game_id, round_number, dealer_user_id) VALUES ($1, $2, $3) RETURNING id`,
    [gameId, roundNumber, dealerUserId]
  );
  const roundId = roundResult.rows[0].id;

  for (const pd of playerData) {
    await query(
      `INSERT INTO bids (round_id, user_id, bid) VALUES ($1, $2, $3)`,
      [roundId, pd.userId, pd.bid]
    );
    await query(
      `INSERT INTO round_scores (round_id, user_id, tricks_won, round_score) VALUES ($1, $2, $3, $4)`,
      [roundId, pd.userId, pd.tricksWon, pd.roundScore]
    );
  }
}

export async function getGameDetails(gameId: string) {
  const game = await query(`SELECT * FROM games WHERE id = $1`, [gameId]);
  if (game.rows.length === 0) return null;

  const players = await query(
    `SELECT gp.*, u.name, u.avatar FROM game_players gp JOIN users u ON u.id = gp.user_id WHERE gp.game_id = $1 ORDER BY gp.placement`,
    [gameId]
  );

  const rounds = await query(
    `SELECT r.*, 
      json_agg(json_build_object('userId', b.user_id, 'bid', b.bid)) as bids,
      json_agg(json_build_object('userId', rs.user_id, 'tricksWon', rs.tricks_won, 'roundScore', rs.round_score)) as scores
     FROM rounds r
     LEFT JOIN bids b ON b.round_id = r.id
     LEFT JOIN round_scores rs ON rs.round_id = r.id
     WHERE r.game_id = $1
     GROUP BY r.id
     ORDER BY r.round_number`,
    [gameId]
  );

  return {
    ...game.rows[0],
    players: players.rows,
    rounds: rounds.rows,
  };
}

export async function getLeaderboard(limit: number = 20) {
  const result = await query(
    `SELECT id, name, avatar, games_played, games_won, highest_score, total_points,
            CASE WHEN games_played > 0 THEN ROUND((games_won::decimal / games_played) * 100, 1) ELSE 0 END as win_rate
     FROM users
     WHERE games_played > 0
     ORDER BY total_points DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

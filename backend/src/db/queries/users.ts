import { query } from '../../config/database';

export interface DbUser {
  id: string;
  google_id: string;
  name: string;
  email: string;
  avatar: string;
  games_played: number;
  games_won: number;
  highest_score: number;
  total_points: number;
  display_name_confirmed: boolean;
  created_at: Date;
  updated_at: Date;
}

export async function findUserByGoogleId(googleId: string): Promise<DbUser | null> {
  const result = await query('SELECT * FROM users WHERE google_id = $1', [googleId]);
  return result.rows[0] || null;
}

export async function findUserById(id: string): Promise<DbUser | null> {
  const result = await query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function createUser(googleId: string, name: string, email: string, avatar: string): Promise<DbUser> {
  const result = await query(
    `INSERT INTO users (google_id, name, email, avatar)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (google_id) DO UPDATE SET
       name = CASE
         WHEN users.display_name_confirmed THEN users.name
         ELSE EXCLUDED.name
       END,
       email = EXCLUDED.email,
       avatar = EXCLUDED.avatar,
       updated_at = NOW()
     RETURNING *`,
    [googleId, name, email, avatar]
  );
  return result.rows[0];
}

export async function updateUserDisplayName(userId: string, name: string): Promise<DbUser | null> {
  const result = await query(
    `UPDATE users
     SET name = $1,
         display_name_confirmed = TRUE,
         updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [name, userId]
  );
  return result.rows[0] || null;
}

export async function updateUserStats(
  userId: string,
  updates: { gamesPlayed?: number; gamesWon?: number; highestScore?: number; totalPoints?: number }
): Promise<void> {
  const sets: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.gamesPlayed !== undefined) {
    sets.push(`games_played = games_played + $${paramIndex++}`);
    values.push(updates.gamesPlayed);
  }
  if (updates.gamesWon !== undefined) {
    sets.push(`games_won = games_won + $${paramIndex++}`);
    values.push(updates.gamesWon);
  }
  if (updates.highestScore !== undefined) {
    sets.push(`highest_score = GREATEST(highest_score, $${paramIndex++})`);
    values.push(updates.highestScore);
  }
  if (updates.totalPoints !== undefined) {
    sets.push(`total_points = total_points + $${paramIndex++}`);
    values.push(updates.totalPoints);
  }

  sets.push(`updated_at = NOW()`);
  values.push(userId);

  await query(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $${paramIndex}`,
    values
  );
}

export async function getUserProfile(userId: string) {
  const user = await findUserById(userId);
  if (!user) return null;

  const matchHistory = await query(
    `SELECT g.id as game_id, g.room_code, g.created_at as date,
            g.player_count, gp.final_score as score, gp.placement,
            CASE WHEN g.winner_id = $1 THEN true ELSE false END as won
     FROM game_players gp
     JOIN games g ON g.id = gp.game_id
     WHERE gp.user_id = $1 AND g.status = 'completed'
     ORDER BY g.created_at DESC
     LIMIT 20`,
    [userId]
  );

  return {
    ...user,
    winRate: user.games_played > 0 ? (user.games_won / user.games_played) * 100 : 0,
    recentMatches: matchHistory.rows,
  };
}

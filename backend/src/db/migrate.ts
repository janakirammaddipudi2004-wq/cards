import fs from 'fs';
import path from 'path';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

async function migrate() {
  try {
    const migrationDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs
      .readdirSync(migrationDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const file of migrationFiles) {
      const migrationPath = path.join(migrationDir, file);
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      await pool.query(sql);
      logger.info(`Applied migration ${file}`);
    }

    logger.info('✅ Database migration completed successfully');
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();

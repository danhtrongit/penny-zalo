/**
 * ==========================================
 * 🔌 Database Connection
 * ==========================================
 * MySQL via mysql2 + Drizzle ORM.
 * Auto-creates database tables and performs
 * lightweight additive migrations on startup.
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema.js';
import logger from '../utils/logger.js';

const DATABASE_URL = process.env.DATABASE_URL || '';

if (!DATABASE_URL) {
  console.error('❌ Missing DATABASE_URL environment variable');
  console.error('📝 Format: mysql://user:password@host:port/database');
  process.exit(1);
}

// Create MySQL connection pool
const pool = mysql.createPool({
  uri: DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Create Drizzle instance
export const db = drizzle(pool, { schema, mode: 'default' });

async function hasColumn(conn: mysql.PoolConnection, table: string, column: string): Promise<boolean> {
  const [rows] = await conn.query<mysql.RowDataPacket[]>(
    `SELECT 1
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
      LIMIT 1`,
    [table, column],
  );

  return rows.length > 0;
}

async function hasIndex(conn: mysql.PoolConnection, table: string, indexName: string): Promise<boolean> {
  const [rows] = await conn.query<mysql.RowDataPacket[]>(
    `SHOW INDEX FROM \`${table}\` WHERE Key_name = ?`,
    [indexName],
  );

  return rows.length > 0;
}

async function ensureColumn(
  conn: mysql.PoolConnection,
  table: string,
  column: string,
  definition: string,
): Promise<void> {
  if (await hasColumn(conn, table, column)) {
    return;
  }

  await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN ${definition}`);
}

async function ensureUniqueIndex(
  conn: mysql.PoolConnection,
  table: string,
  indexName: string,
  expression: string,
): Promise<void> {
  if (await hasIndex(conn, table, indexName)) {
    return;
  }

  await conn.query(`CREATE UNIQUE INDEX \`${indexName}\` ON \`${table}\` (${expression})`);
}

async function ensureIndex(
  conn: mysql.PoolConnection,
  table: string,
  indexName: string,
  expression: string,
): Promise<void> {
  if (await hasIndex(conn, table, indexName)) {
    return;
  }

  await conn.query(`CREATE INDEX \`${indexName}\` ON \`${table}\` (${expression})`);
}

/**
 * Initialize database tables (run on startup)
 */
export async function initDatabase(): Promise<void> {
  logger.info('🗄️  Initializing MySQL database...');

  const conn = await pool.getConnection();

  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        telegram_id BIGINT NULL,
        zalo_user_id VARCHAR(255) NULL,
        zalo_chat_id VARCHAR(255) NULL,
        first_name VARCHAR(255) NOT NULL DEFAULT '',
        last_name VARCHAR(255) DEFAULT '',
        username VARCHAR(255) DEFAULT '',
        created_at DATETIME NOT NULL DEFAULT NOW()
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        amount DOUBLE NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(100) NOT NULL DEFAULT 'Khác',
        raw_input TEXT,
        source VARCHAR(20) NOT NULL DEFAULT 'text',
        media_path TEXT,
        transaction_date DATETIME NOT NULL DEFAULT NOW(),
        status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
        created_at DATETIME NOT NULL DEFAULT NOW(),
        INDEX idx_transactions_user_date (user_id, transaction_date),
        FOREIGN KEY (user_id) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS budgets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        period VARCHAR(20) NOT NULL,
        amount DOUBLE NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at DATETIME NOT NULL DEFAULT NOW(),
        INDEX idx_budgets_user_active (user_id, is_active),
        FOREIGN KEY (user_id) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS persona_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        preset VARCHAR(100) NOT NULL DEFAULT 'bạn thân',
        sarcasm_level INT NOT NULL DEFAULT 5,
        seriousness_level INT NOT NULL DEFAULT 5,
        frugality_level INT NOT NULL DEFAULT 5,
        emoji_level INT NOT NULL DEFAULT 5,
        display_name VARCHAR(255) DEFAULT '',
        age INT DEFAULT NULL,
        gender VARCHAR(20) DEFAULT '',
        created_at DATETIME NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS dashboard_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        created_at DATETIME NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS ai_usage_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        task_type VARCHAR(50) NOT NULL,
        tokens_used INT DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS account_link_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        platform VARCHAR(20) NOT NULL DEFAULT 'zalo',
        code VARCHAR(32) NOT NULL,
        expires_at DATETIME NOT NULL,
        used_at DATETIME DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT NOW(),
        UNIQUE KEY uk_account_link_codes_code (code),
        INDEX idx_account_link_codes_user_platform (user_id, platform),
        FOREIGN KEY (user_id) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await conn.query(`
      ALTER TABLE users
      MODIFY COLUMN telegram_id BIGINT NULL
    `);

    await ensureColumn(conn, 'users', 'zalo_user_id', 'zalo_user_id VARCHAR(255) NULL AFTER telegram_id');
    await ensureColumn(conn, 'users', 'zalo_chat_id', 'zalo_chat_id VARCHAR(255) NULL AFTER zalo_user_id');
    await ensureColumn(conn, 'transactions', 'media_hash', 'media_hash VARCHAR(64) NULL AFTER media_path');

    await ensureUniqueIndex(conn, 'users', 'uk_users_zalo_user_id', '`zalo_user_id`');
    await ensureUniqueIndex(conn, 'users', 'uk_users_zalo_chat_id', '`zalo_chat_id`');
    await ensureIndex(conn, 'transactions', 'idx_transactions_user_media_hash', '`user_id`, `media_hash`');

    logger.info('✅ MySQL database initialized successfully');
  } finally {
    conn.release();
  }
}

/**
 * Close database connection pool (for graceful shutdown)
 */
export async function closeDatabase(): Promise<void> {
  await pool.end();
  logger.info('🔌 MySQL connection pool closed');
}

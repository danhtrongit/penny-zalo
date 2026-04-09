/**
 * ==========================================
 * 🗄️ Database Schema (Drizzle ORM + MySQL)
 * ==========================================
 */

import { mysqlTable, varchar, int, bigint, double, boolean, datetime, text, index, uniqueIndex } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

// --- Users ---
export const users = mysqlTable('users', {
  id: int('id').primaryKey().autoincrement(),
  telegramId: bigint('telegram_id', { mode: 'number' }),
  zaloUserId: varchar('zalo_user_id', { length: 255 }),
  zaloChatId: varchar('zalo_chat_id', { length: 255 }),
  firstName: varchar('first_name', { length: 255 }).notNull().default(''),
  lastName: varchar('last_name', { length: 255 }).default(''),
  username: varchar('username', { length: 255 }).default(''),
  createdAt: datetime('created_at').notNull().default(sql`NOW()`),
}, (table) => [
  uniqueIndex('uk_users_telegram_id').on(table.telegramId),
  uniqueIndex('uk_users_zalo_user_id').on(table.zaloUserId),
  uniqueIndex('uk_users_zalo_chat_id').on(table.zaloChatId),
]);

// --- Transactions ---
export const transactions = mysqlTable('transactions', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull().references(() => users.id),
  amount: double('amount').notNull(),
  description: text('description').notNull(),
  category: varchar('category', { length: 100 }).notNull().default('Khác'),
  rawInput: text('raw_input'),
  source: varchar('source', { length: 20 }).notNull().default('text'), // text | image | pdf
  mediaPath: text('media_path'), // path to original receipt file
  transactionDate: datetime('transaction_date').notNull().default(sql`NOW()`),
  status: varchar('status', { length: 20 }).notNull().default('confirmed'), // confirmed | pending
  createdAt: datetime('created_at').notNull().default(sql`NOW()`),
}, (table) => [
  index('idx_transactions_user_date').on(table.userId, table.transactionDate),
]);

// --- Budgets ---
export const budgets = mysqlTable('budgets', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull().references(() => users.id),
  period: varchar('period', { length: 20 }).notNull(), // week | month
  amount: double('amount').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: datetime('created_at').notNull().default(sql`NOW()`),
}, (table) => [
  index('idx_budgets_user_active').on(table.userId, table.isActive),
]);

// --- Persona Settings ---
export const personaSettings = mysqlTable('persona_settings', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull().references(() => users.id).unique(),
  preset: varchar('preset', { length: 100 }).notNull().default('bạn thân'),
  sarcasmLevel: int('sarcasm_level').notNull().default(5),
  seriousnessLevel: int('seriousness_level').notNull().default(5),
  frugalityLevel: int('frugality_level').notNull().default(5),
  emojiLevel: int('emoji_level').notNull().default(5),
  displayName: varchar('display_name', { length: 255 }).default(''),
  age: int('age'),
  gender: varchar('gender', { length: 20 }).default(''),
  createdAt: datetime('created_at').notNull().default(sql`NOW()`),
});

// --- Dashboard Sessions ---
export const dashboardSessions = mysqlTable('dashboard_sessions', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull().references(() => users.id),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expiresAt: datetime('expires_at').notNull(),
  createdAt: datetime('created_at').notNull().default(sql`NOW()`),
});

// --- AI Usage Logs ---
export const aiUsageLogs = mysqlTable('ai_usage_logs', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull().references(() => users.id),
  taskType: varchar('task_type', { length: 50 }).notNull(), // chat | parse | ocr | pdf
  tokensUsed: int('tokens_used').default(0),
  createdAt: datetime('created_at').notNull().default(sql`NOW()`),
});

// --- Account Link Codes ---
export const accountLinkCodes = mysqlTable('account_link_codes', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull().references(() => users.id),
  platform: varchar('platform', { length: 20 }).notNull().default('zalo'),
  code: varchar('code', { length: 32 }).notNull(),
  expiresAt: datetime('expires_at').notNull(),
  usedAt: datetime('used_at'),
  createdAt: datetime('created_at').notNull().default(sql`NOW()`),
}, (table) => [
  uniqueIndex('uk_account_link_codes_code').on(table.code),
  index('idx_account_link_codes_user_platform').on(table.userId, table.platform),
]);

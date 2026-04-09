/**
 * ==========================================
 * 👤 User Repository
 * ==========================================
 */

import { eq, sql } from 'drizzle-orm';
import { db } from '../connection.js';
import {
  accountLinkCodes,
  budgets,
  dashboardSessions,
  personaSettings,
  transactions,
  users,
} from '../schema.js';

export interface CreateUserData {
  telegramId: number;
  firstName: string;
  lastName?: string;
  username?: string;
}

export interface CreateZaloUserData {
  zaloUserId: string;
  chatId: string;
  displayName: string;
}

export interface UserFootprint {
  transactions: number;
  budgets: number;
  sessions: number;
  personaRows: number;
}

/**
 * Find or create a user by Telegram ID
 */
export async function findOrCreateUser(data: CreateUserData) {
  // Try to find existing user
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.telegramId, data.telegramId))
    .limit(1);

  if (existing) return existing;

  // Create new user
  await db
    .insert(users)
    .values({
      telegramId: data.telegramId,
      firstName: data.firstName,
      lastName: data.lastName || '',
      username: data.username || '',
      zaloUserId: null,
      zaloChatId: null,
    });

  // Fetch the newly created user
  const [newUser] = await db
    .select()
    .from(users)
    .where(eq(users.telegramId, data.telegramId))
    .limit(1);

  return newUser;
}

/**
 * Get user by Telegram ID
 */
export async function getUserByTelegramId(telegramId: number) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.telegramId, telegramId))
    .limit(1);

  return user ?? null;
}

/**
 * Get user by internal ID
 */
export async function getUserById(id: number) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return user ?? null;
}

/**
 * Get all users
 */
export async function getAllUsers() {
  return db.select().from(users);
}

export async function getUserByZaloUserId(zaloUserId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.zaloUserId, zaloUserId))
    .limit(1);

  return user ?? null;
}

export async function getUserByZaloChatId(zaloChatId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.zaloChatId, zaloChatId))
    .limit(1);

  return user ?? null;
}

export async function findOrCreateZaloUser(data: CreateZaloUserData) {
  const existing =
    await getUserByZaloUserId(data.zaloUserId) ||
    await getUserByZaloChatId(data.chatId);

  if (existing) {
    await db
      .update(users)
      .set({
        zaloUserId: data.zaloUserId,
        zaloChatId: data.chatId,
        firstName: data.displayName || existing.firstName,
      })
      .where(eq(users.id, existing.id));

    return getUserById(existing.id);
  }

  const displayName = data.displayName.trim() || 'Bạn';

  await db
    .insert(users)
    .values({
      telegramId: null,
      zaloUserId: data.zaloUserId,
      zaloChatId: data.chatId,
      firstName: displayName,
      lastName: '',
      username: '',
    });

  const [created] = await db
    .select()
    .from(users)
    .where(eq(users.zaloUserId, data.zaloUserId))
    .limit(1);

  return created ?? null;
}

export async function linkZaloIdentityToUser(
  userId: number,
  data: CreateZaloUserData,
) {
  const byUserId = await getUserByZaloUserId(data.zaloUserId);
  if (byUserId && byUserId.id !== userId) {
    throw new Error('Tài khoản Zalo này đã được liên kết với người dùng khác.');
  }

  const byChatId = await getUserByZaloChatId(data.chatId);
  if (byChatId && byChatId.id !== userId) {
    throw new Error('Cuộc trò chuyện Zalo này đã được liên kết với người dùng khác.');
  }

  await db
    .update(users)
    .set({
      zaloUserId: data.zaloUserId,
      zaloChatId: data.chatId,
      firstName: data.displayName.trim() || undefined,
    })
    .where(eq(users.id, userId));

  return getUserById(userId);
}

export async function getUserFootprint(userId: number): Promise<UserFootprint> {
  const [txRows, budgetRows, sessionRows, personaRows] = await Promise.all([
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(transactions)
      .where(eq(transactions.userId, userId)),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(budgets)
      .where(eq(budgets.userId, userId)),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(dashboardSessions)
      .where(eq(dashboardSessions.userId, userId)),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(personaSettings)
      .where(eq(personaSettings.userId, userId)),
  ]);

  return {
    transactions: txRows[0]?.count ?? 0,
    budgets: budgetRows[0]?.count ?? 0,
    sessions: sessionRows[0]?.count ?? 0,
    personaRows: personaRows[0]?.count ?? 0,
  };
}

export async function deleteEmptyUser(userId: number): Promise<boolean> {
  const footprint = await getUserFootprint(userId);
  if (footprint.transactions > 0 || footprint.budgets > 0) {
    return false;
  }

  await db.delete(accountLinkCodes).where(eq(accountLinkCodes.userId, userId));
  await db.delete(dashboardSessions).where(eq(dashboardSessions.userId, userId));
  await db.delete(personaSettings).where(eq(personaSettings.userId, userId));
  await db.delete(users).where(eq(users.id, userId));

  return true;
}

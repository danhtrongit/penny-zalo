/**
 * ==========================================
 * 💳 Transaction Repository
 * ==========================================
 */

import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { db } from '../connection.js';
import { transactions } from '../schema.js';
import type { TransactionSource, Category } from '../../types/index.js';

export interface CreateTransactionData {
  userId: number;
  amount: number;
  description: string;
  category: string;
  rawInput?: string;
  source?: TransactionSource;
  mediaPath?: string;
  mediaHash?: string;
  transactionDate?: string;
  status?: string;
}

/**
 * Create a new transaction
 */
export async function createTransaction(data: CreateTransactionData) {
  const result = await db
    .insert(transactions)
    .values({
      userId: data.userId,
      amount: data.amount,
      description: data.description,
      category: data.category,
      rawInput: data.rawInput || '',
      source: data.source || 'text',
      mediaPath: data.mediaPath || '',
      mediaHash: data.mediaHash || null,
      transactionDate: data.transactionDate ? new Date(data.transactionDate) : new Date(),
      status: data.status || 'confirmed',
    });

  // MySQL returns insertId
  const insertId = Number(result[0].insertId);

  const [created] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, insertId))
    .limit(1);

  return created;
}

/**
 * Create multiple transactions at once
 */
export async function createTransactions(items: CreateTransactionData[]) {
  await db
    .insert(transactions)
    .values(
      items.map((data) => ({
        userId: data.userId,
        amount: data.amount,
        description: data.description,
        category: data.category,
        rawInput: data.rawInput || '',
        source: data.source || 'text',
        mediaPath: data.mediaPath || '',
        mediaHash: data.mediaHash || null,
        transactionDate: data.transactionDate ? new Date(data.transactionDate) : new Date(),
        status: data.status || 'confirmed',
      }))
    );

  // For bulk insert, return the latest transactions for this user
  const userId = items[0]?.userId;
  if (!userId) return [];

  return db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.id))
    .limit(items.length);
}

/**
 * Get transactions for a user within a date range
 */
export async function getTransactions(
  userId: number,
  fromDate?: Date,
  limit = 50
) {
  if (fromDate) {
    return db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.transactionDate, fromDate)
        )
      )
      .orderBy(desc(transactions.transactionDate))
      .limit(limit);
  }

  return db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.transactionDate))
    .limit(limit);
}

/**
 * Get recent transactions (for duplicate detection)
 * Returns transactions with same amount in last N minutes
 */
export async function getRecentSameAmount(
  userId: number,
  amount: number,
  minutesAgo = 10
) {
  return db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.amount, amount),
        gte(transactions.createdAt, sql`DATE_SUB(NOW(), INTERVAL ${minutesAgo} MINUTE)`)
      )
    );
}

/**
 * Get total spending for a user since a given date
 */
export async function getTotalSpending(userId: number, fromDate: Date, toDate?: Date): Promise<number> {
  const conditions = [
    eq(transactions.userId, userId),
    gte(transactions.transactionDate, fromDate),
    eq(transactions.status, 'confirmed')
  ];

  if (toDate) {
    conditions.push(lte(transactions.transactionDate, toDate));
  }

  const [result] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(and(...conditions));

  return result?.total ?? 0;
}

/**
 * Get spending grouped by category
 */
export async function getSpendingByCategory(userId: number, fromDate: Date) {
  return db
    .select({
      category: transactions.category,
      total: sql<number>`SUM(${transactions.amount})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.transactionDate, fromDate),
        eq(transactions.status, 'confirmed')
      )
    )
    .groupBy(transactions.category)
    .orderBy(sql`SUM(${transactions.amount}) DESC`);
}

/**
 * Delete a transaction
 */
export async function deleteTransaction(id: number, userId: number) {
  // Fetch the transaction first so we can return it
  const [existing] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .limit(1);

  if (!existing) return null;

  await db
    .delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));

  return existing;
}

/**
 * Update a transaction
 */
export async function updateTransaction(
  id: number,
  userId: number,
  data: Partial<Pick<CreateTransactionData, 'amount' | 'description' | 'category'>>
) {
  await db
    .update(transactions)
    .set(data)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));

  const [updated] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .limit(1);

  return updated ?? null;
}

/**
 * Get a single transaction by ID and userId
 */
export async function getTransactionById(id: number, userId: number) {
  const [txn] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .limit(1);

  return txn ?? null;
}

/**
 * Get transactions that have media (receipts) attached.
 * Useful for AI to find receipts user is asking about.
 */
export async function getTransactionsWithMedia(userId: number, limit = 20) {
  return db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        sql`${transactions.mediaPath} IS NOT NULL AND ${transactions.mediaPath} != ''`
      )
    )
    .orderBy(desc(transactions.transactionDate))
    .limit(limit);
}

export async function getTransactionsByMediaHash(userId: number, mediaHash: string, limit = 20) {
  return db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.mediaHash, mediaHash),
      )
    )
    .orderBy(desc(transactions.id))
    .limit(limit);
}

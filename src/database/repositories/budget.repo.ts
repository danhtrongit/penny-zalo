/**
 * ==========================================
 * 💰 Budget Repository
 * ==========================================
 */

import { eq, and } from 'drizzle-orm';
import { db } from '../connection.js';
import { budgets } from '../schema.js';
import type { BudgetPeriod } from '../../types/index.js';

/**
 * Set a new budget (deactivates old one of same period)
 */
export async function setBudget(userId: number, period: BudgetPeriod, amount: number) {
  // Deactivate existing budget of same period
  await db.update(budgets)
    .set({ isActive: false })
    .where(
      and(
        eq(budgets.userId, userId),
        eq(budgets.period, period),
        eq(budgets.isActive, true)
      )
    );

  // Create new active budget
  const result = await db
    .insert(budgets)
    .values({ userId, period, amount, isActive: true });

  const insertId = Number(result[0].insertId);

  const [created] = await db
    .select()
    .from(budgets)
    .where(eq(budgets.id, insertId))
    .limit(1);

  return created;
}

/**
 * Get active budget for a user and period
 */
export async function getActiveBudget(userId: number, period: BudgetPeriod) {
  const [budget] = await db
    .select()
    .from(budgets)
    .where(
      and(
        eq(budgets.userId, userId),
        eq(budgets.period, period),
        eq(budgets.isActive, true)
      )
    )
    .limit(1);

  return budget ?? null;
}

/**
 * Get all active budgets for a user
 */
export async function getActiveBudgets(userId: number) {
  return db
    .select()
    .from(budgets)
    .where(and(eq(budgets.userId, userId), eq(budgets.isActive, true)));
}

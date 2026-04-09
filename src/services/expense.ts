/**
 * ==========================================
 * 💳 Expense Service
 * ==========================================
 * Business logic for recording expenses.
 */

import * as txRepo from '../database/repositories/transaction.repo.js';
import { resolveDate } from '../utils/date.js';
import { formatCurrency } from '../utils/currency.js';
import { CATEGORY_EMOJI, type Category } from '../types/index.js';
import type { ParsedExpense } from '../types/index.js';
import logger from '../utils/logger.js';

export interface SaveResult {
  saved: Awaited<ReturnType<typeof txRepo.createTransaction>>[];
  totalAmount: number;
  summary: string;
  hasDuplicate: boolean;
  duplicateAmount?: number;
}

function normalizeDuplicateText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function shouldFlagDuplicateExpense(
  current: { amount: number; description: string; category?: string },
  recentTransactions: Array<{ amount: number; description: string; category?: string }>,
): boolean {
  const currentDescription = normalizeDuplicateText(current.description);
  if (!currentDescription) {
    return false;
  }

  return recentTransactions.some((tx) => {
    if (tx.amount !== current.amount) {
      return false;
    }

    const existingDescription = normalizeDuplicateText(tx.description);
    if (!existingDescription) {
      return false;
    }

    return (
      existingDescription === currentDescription ||
      existingDescription.includes(currentDescription) ||
      currentDescription.includes(existingDescription)
    );
  });
}

/**
 * Save parsed expenses to database
 */
export async function saveExpenses(
  userId: number,
  parsed: ParsedExpense,
  rawInput: string
): Promise<SaveResult> {
  const savedTxs: Awaited<ReturnType<typeof txRepo.createTransaction>>[] = [];
  let hasDuplicate = false;
  let duplicateAmount: number | undefined;

  for (const item of parsed.items) {
    // Check for duplicates (only for single items)
    if (parsed.items.length === 1) {
      const recent = await txRepo.getRecentSameAmount(userId, item.amount, 10);
      if (shouldFlagDuplicateExpense(item, recent)) {
        hasDuplicate = true;
        duplicateAmount = item.amount;
        // Don't save yet — let the handler ask for confirmation
        return {
          saved: [],
          totalAmount: item.amount,
          summary: '',
          hasDuplicate: true,
          duplicateAmount: item.amount,
        };
      }
    }

    // Use item-level date if available, then global date, then today
    const itemDate = (item as any).date || parsed.date || undefined;
    const txDate = resolveDate(itemDate).toISOString();

    const tx = await txRepo.createTransaction({
      userId,
      amount: item.amount,
      description: item.description,
      category: item.category,
      rawInput,
      source: 'text',
      transactionDate: txDate,
    });

    savedTxs.push(tx);
  }

  const totalAmount = savedTxs.reduce((sum, tx) => sum + tx.amount, 0);
  const summary = buildSummary(savedTxs);

  logger.info(`💾 Saved ${savedTxs.length} transaction(s), total: ${formatCurrency(totalAmount)}`);

  return {
    saved: savedTxs,
    totalAmount,
    summary,
    hasDuplicate: false,
  };
}

/**
 * Force save a single expense (after duplicate confirmation)
 */
export async function forceSaveExpense(
  userId: number,
  amount: number,
  description: string,
  category: string,
  rawInput: string,
  date?: string
) {
  const txDate = resolveDate(date).toISOString();

  return txRepo.createTransaction({
    userId,
    amount,
    description,
    category,
    rawInput,
    source: 'text',
    transactionDate: txDate,
  });
}

/**
 * Build a summary string for saved transactions
 */
function buildSummary(
  txs: Awaited<ReturnType<typeof txRepo.createTransaction>>[]
): string {
  if (txs.length === 0) return '';

  if (txs.length === 1) {
    const tx = txs[0];
    const emoji = CATEGORY_EMOJI[tx.category as Category] || '📦';
    return `${emoji} ${tx.description}: ${formatCurrency(tx.amount)}`;
  }

  // Multiple items
  const lines = txs.map((tx) => {
    const emoji = CATEGORY_EMOJI[tx.category as Category] || '📦';
    return `  ${emoji} ${tx.description}: ${formatCurrency(tx.amount)}`;
  });

  const total = txs.reduce((sum, tx) => sum + tx.amount, 0);
  lines.push(`\n💰 Tổng: ${formatCurrency(total)}`);

  return lines.join('\n');
}

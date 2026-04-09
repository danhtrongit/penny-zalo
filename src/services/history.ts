/**
 * ==========================================
 * 📋 History Service
 * ==========================================
 * Generates transaction history grouped by day
 * with daily totals and period total.
 */

import { getTransactions } from '../database/repositories/transaction.repo.js';
import { getTodayStart, getWeekStart, getMonthStart, formatDateShort } from '../utils/date.js';
import { formatCurrency } from '../utils/currency.js';
import { CATEGORY_EMOJI, type Category } from '../types/index.js';

/**
 * Resolve period string to start date
 */
function resolveHistoryPeriod(period?: string): { fromDate: Date; label: string } {
  const lower = (period || '').trim().toLowerCase();

  if (lower.includes('hôm nay') || lower.includes('nay') || lower === 'today') {
    return { fromDate: getTodayStart(), label: 'hôm nay' };
  }
  if (lower.includes('hôm qua') || lower.includes('qua') || lower === 'yesterday') {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(0, 0, 0, 0);
    return { fromDate: d, label: 'hôm qua' };
  }
  if (lower.includes('tuần') || lower === 'week') {
    return { fromDate: getWeekStart(), label: 'tuần này' };
  }
  if (lower.includes('tháng') || lower === 'month') {
    return { fromDate: getMonthStart(), label: 'tháng này' };
  }

  // Default: this month
  return { fromDate: getMonthStart(), label: 'tháng này' };
}

/**
 * Get formatted transaction history
 */
export async function getHistory(userId: number, period?: string, limit = 50): Promise<string> {
  const { fromDate, label } = resolveHistoryPeriod(period);

  const txs = await getTransactions(userId, fromDate, limit);

  if (txs.length === 0) {
    return `📋 Không có giao dịch nào ${label}.`;
  }

  // Group by day
  const groups = new Map<string, typeof txs>();

  for (const tx of txs) {
    // transactionDate is now a Date object from MySQL
    const day = tx.transactionDate instanceof Date
      ? tx.transactionDate.toISOString().substring(0, 10)
      : String(tx.transactionDate).substring(0, 10); // YYYY-MM-DD
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day)!.push(tx);
  }

  const lines: string[] = [];
  lines.push(`📋 *Chi tiêu ${label}:*`);
  lines.push('');

  let grandTotal = 0;

  for (const [day, dayTxs] of groups) {
    const date = new Date(day);
    const dayTotal = dayTxs.reduce((sum, tx) => sum + tx.amount, 0);
    grandTotal += dayTotal;

    lines.push(`📅 *${formatDateShort(date)}* — ${formatCurrency(dayTotal)}`);

    for (const tx of dayTxs) {
      const emoji = CATEGORY_EMOJI[tx.category as Category] || '📦';
      const sourceTag = tx.source !== 'text' ? ` [${tx.source}]` : '';
      lines.push(`  ${emoji} ${tx.description}: ${formatCurrency(tx.amount)}${sourceTag}`);
    }
    lines.push('');
  }

  lines.push(`💰 *Tổng: ${formatCurrency(grandTotal)}* (${txs.length} giao dịch)`);

  return lines.join('\n');
}

/**
 * Get recent N transactions (no grouping)
 */
export async function getRecent(userId: number, count = 10): Promise<string> {
  const txs = await getTransactions(userId, undefined, count);

  if (txs.length === 0) {
    return '📋 Chưa có giao dịch nào.';
  }

  const lines: string[] = [];
  lines.push(`📋 *${txs.length} khoản gần nhất:*`);
  lines.push('');

  let total = 0;

  for (const tx of txs) {
    const emoji = CATEGORY_EMOJI[tx.category as Category] || '📦';
    const date = tx.transactionDate instanceof Date
      ? tx.transactionDate
      : new Date(tx.transactionDate);
    const dateStr = formatDateShort(date);
    const sourceTag = tx.source !== 'text' ? ` [${tx.source}]` : '';
    lines.push(`${emoji} ${dateStr} — ${tx.description}: ${formatCurrency(tx.amount)}${sourceTag}`);
    total += tx.amount;
  }

  lines.push('');
  lines.push(`💰 *Tổng: ${formatCurrency(total)}*`);

  return lines.join('\n');
}

/**
 * ==========================================
 * 📊 Report Service
 * ==========================================
 * Generates weekly/monthly spending reports
 * with category breakdown, budget comparison,
 * and progress bars.
 */

import { getTotalSpending, getSpendingByCategory } from '../database/repositories/transaction.repo.js';
import { getActiveBudget } from '../database/repositories/budget.repo.js';
import { getWeekStart, getMonthStart, formatDateShort } from '../utils/date.js';
import { formatCurrency } from '../utils/currency.js';
import { CATEGORY_EMOJI, type Category } from '../types/index.js';

export interface ReportData {
  weekTotal: number;
  monthTotal: number;
  weekBudget: number | null;
  monthBudget: number | null;
  weekCategories: Array<{ category: string; total: number; count: number }>;
  monthCategories: Array<{ category: string; total: number; count: number }>;
}

/**
 * Generate report data for a user
 */
export async function getReportData(userId: number): Promise<ReportData> {
  const weekStart = getWeekStart();
  const monthStart = getMonthStart();

  const [weekBudgetRow, monthBudgetRow, weekTotal, monthTotal, weekCategories, monthCategories] = await Promise.all([
    getActiveBudget(userId, 'week'),
    getActiveBudget(userId, 'month'),
    getTotalSpending(userId, weekStart),
    getTotalSpending(userId, monthStart),
    getSpendingByCategory(userId, weekStart),
    getSpendingByCategory(userId, monthStart),
  ]);

  return {
    weekTotal,
    monthTotal,
    weekBudget: weekBudgetRow?.amount ?? null,
    monthBudget: monthBudgetRow?.amount ?? null,
    weekCategories,
    monthCategories,
  };
}

/**
 * Format report as Telegram message
 */
export function formatReport(data: ReportData): string {
  const now = new Date();
  const lines: string[] = [];

  lines.push(`📊 *Báo cáo chi tiêu*`);
  lines.push('');

  // --- Week ---
  const weekStart = getWeekStart();
  lines.push(`📅 *Tuần này* (${formatDateShort(weekStart)} - ${formatDateShort(now)})`);

  if (data.weekBudget) {
    const pct = Math.round((data.weekTotal / data.weekBudget) * 100);
    const bar = buildBar(pct);
    lines.push(`💸 ${formatCurrency(data.weekTotal)} / ${formatCurrency(data.weekBudget)} (${pct}%)`);
    lines.push(bar);

    const remaining = data.weekBudget - data.weekTotal;
    if (remaining > 0) {
      lines.push(`💚 Còn: ${formatCurrency(remaining)}`);
    } else {
      lines.push(`🔴 Vượt: ${formatCurrency(Math.abs(remaining))}`);
    }
  } else {
    lines.push(`💸 Tổng: ${formatCurrency(data.weekTotal)}`);
  }
  lines.push('');

  // --- Month ---
  lines.push(`📆 *Tháng ${now.getMonth() + 1}*`);

  if (data.monthBudget) {
    const pct = Math.round((data.monthTotal / data.monthBudget) * 100);
    const bar = buildBar(pct);
    lines.push(`💸 ${formatCurrency(data.monthTotal)} / ${formatCurrency(data.monthBudget)} (${pct}%)`);
    lines.push(bar);

    const remaining = data.monthBudget - data.monthTotal;
    if (remaining > 0) {
      lines.push(`💚 Còn: ${formatCurrency(remaining)}`);
    } else {
      lines.push(`🔴 Vượt: ${formatCurrency(Math.abs(remaining))}`);
    }
  } else {
    lines.push(`💸 Tổng: ${formatCurrency(data.monthTotal)}`);
  }
  lines.push('');

  // --- Category breakdown (month) ---
  if (data.monthCategories.length > 0) {
    lines.push(`📂 *Phân rã theo danh mục (tháng):*`);
    for (const cat of data.monthCategories) {
      const emoji = CATEGORY_EMOJI[cat.category as Category] || '📦';
      const pct = data.monthTotal > 0
        ? Math.round((cat.total / data.monthTotal) * 100)
        : 0;
      lines.push(`  ${emoji} ${cat.category}: ${formatCurrency(cat.total)} (${pct}%)`);
    }
  } else {
    lines.push('📂 Chưa có giao dịch nào trong tháng.');
  }

  return lines.join('\n');
}

/**
 * Build progress bar
 */
function buildBar(pct: number): string {
  const clamped = Math.min(100, Math.max(0, pct));
  const filled = Math.round(clamped / 10);
  const empty = 10 - filled;

  let bar = '█'.repeat(filled) + '░'.repeat(empty);

  if (pct >= 100) bar = '🔴 ' + bar;
  else if (pct >= 80) bar = '🟡 ' + bar;
  else bar = '🟢 ' + bar;

  return bar;
}

/**
 * ==========================================
 * 💰 /limit Command — Đặt ngân sách
 * ==========================================
 */

import type { Telegraf, Context } from 'telegraf';
import { setBudget, getActiveBudgets } from '../database/repositories/budget.repo.js';
import { formatCurrency } from '../utils/currency.js';
import { parseCurrency } from '../utils/currency.js';
import type { BudgetPeriod } from '../types/index.js';

/** Track users waiting for budget amount input */
const waitingForBudget = new Map<number, BudgetPeriod>();

export function registerLimitCommand(bot: Telegraf<Context>): void {
  bot.command('limit', async (ctx) => {
    if (!ctx.dbUser) return;

    // Show current budgets + options
    const budgets = await getActiveBudgets(ctx.dbUser.id);
    let currentText = '';

    if (budgets.length > 0) {
      const lines = budgets.map((b) => {
        const label = b.period === 'week' ? 'Tuần' : 'Tháng';
        return `• ${label}: ${formatCurrency(b.amount)}`;
      });
      currentText = `📊 Ngân sách hiện tại:\n${lines.join('\n')}\n\n`;
    }

    await ctx.reply(
      `${currentText}💰 Chọn loại ngân sách muốn đặt:`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📅 Ngân sách tuần', callback_data: 'budget:week' },
              { text: '📆 Ngân sách tháng', callback_data: 'budget:month' },
            ],
          ],
        },
      }
    );
  });

  // --- Handle period selection ---
  bot.action(/^budget:(week|month)$/, async (ctx) => {
    if (!ctx.dbUser) return;

    const period = ctx.match[1] as BudgetPeriod;
    const label = period === 'week' ? 'tuần' : 'tháng';

    waitingForBudget.set(ctx.dbUser.telegramId, period);

    await ctx.editMessageText(
      `💰 Nhập số tiền ngân sách ${label}:\n\n` +
      `Ví dụ: _500k_, _1.5 triệu_, _5000000_`,
      { parse_mode: 'Markdown' }
    );

    await ctx.answerCbQuery();
  });
}

/**
 * Check if user is waiting for budget input
 */
export function isWaitingForBudget(telegramId: number): boolean {
  return waitingForBudget.has(telegramId);
}

/**
 * Handle budget amount input
 */
export async function handleBudgetInput(ctx: Context): Promise<void> {
  if (!ctx.dbUser || !ctx.message || !('text' in ctx.message)) return;

  const period = waitingForBudget.get(ctx.dbUser.telegramId);
  if (!period) return;

  waitingForBudget.delete(ctx.dbUser.telegramId);

  const amount = parseCurrency(ctx.message.text);
  if (!amount || amount <= 0) {
    await ctx.reply('❌ Số tiền không hợp lệ. Vui lòng thử lại: /limit');
    return;
  }

  await setBudget(ctx.dbUser.id, period, amount);

  const label = period === 'week' ? 'tuần' : 'tháng';
  await ctx.reply(`✅ Đã đặt ngân sách ${label}: *${formatCurrency(amount)}*`, {
    parse_mode: 'Markdown',
  });
}

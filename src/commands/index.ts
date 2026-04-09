/**
 * ==========================================
 * 📜 Command Registry
 * ==========================================
 */

import type { Telegraf, Context } from 'telegraf';
import { registerStartCommand } from './start.js';
import { registerToneCommand } from './tone.js';
import { registerLimitCommand } from './limit.js';
import { registerLoginCommand } from './login.js';
import { registerAdminCommand } from './admin.js';
import { getReportData, formatReport } from '../services/report.js';
import { getRecent } from '../services/history.js';
import { chatStream } from '../services/ai.js';

export function registerAllCommands(bot: Telegraf<Context>): void {
  registerStartCommand(bot);
  registerToneCommand(bot);
  registerLimitCommand(bot);
  registerLoginCommand(bot);
  registerAdminCommand(bot);

  // /help
  bot.help((ctx) =>
    ctx.reply(
      `📋 *Danh sách lệnh:*\n\n` +
      `/start — Cài đặt ban đầu\n` +
      `/limit — Đặt ngân sách tuần/tháng\n` +
      `/report — Báo cáo chi tiêu\n` +
      `/recent — 10 khoản gần nhất\n` +
      `/tone — Chỉnh giọng điệu Penny\n` +
      `/login — Mở Dashboard\n` +
      `/help — Xem hướng dẫn\n\n` +
      `💬 *Ghi chi tiêu:* nhắn tự nhiên\n` +
      `📸 *Đọc hóa đơn:* gửi ảnh (sắp có)\n`,
      { parse_mode: 'Markdown' }
    )
  );

  // /report — Báo cáo chi tiêu
  bot.command('report', async (ctx) => {
    if (!ctx.dbUser) return;

    await ctx.sendChatAction('typing');

    const data = await getReportData(ctx.dbUser.id);
    const report = formatReport(data);

    // AI comment based on persona
    let comment = '';
    try {
      const prompt = `Dữ liệu chi tiêu tuần: ${data.weekTotal}, tháng: ${data.monthTotal}. ` +
        `Ngân sách tháng: ${data.monthBudget || 'chưa đặt'}. ` +
        `Hãy nhận xét ngắn 1-2 câu theo đúng persona hiện tại. Chỉ nhận xét, không liệt kê số liệu.`;

      for await (const chunk of chatStream(prompt, ctx.dbUser.id)) {
        comment += chunk;
      }
    } catch {
      // Skip comment on error
    }

    const fullReport = comment
      ? `${report}\n\n💬 *Penny:* ${comment}`
      : report;

    await ctx.reply(fullReport, { parse_mode: 'Markdown' });
  });

  // /recent — 10 khoản gần nhất
  bot.command('recent', async (ctx) => {
    if (!ctx.dbUser) return;

    const result = await getRecent(ctx.dbUser.id, 10);
    await ctx.reply(result, { parse_mode: 'Markdown' });
  });

  // /ping
  bot.command('ping', (ctx) => {
    const start = Date.now();
    return ctx.reply(`🏓 Pong! (${Date.now() - start}ms)`);
  });

  // /id
  bot.command('id', (ctx) =>
    ctx.reply(
      `👤 *Thông tin:*\n` +
      `• User ID: \`${ctx.from?.id}\`\n` +
      `• Chat ID: \`${ctx.chat?.id}\`\n` +
      `• Name: ${ctx.from?.first_name || ''}` +
      (ctx.from?.username ? `\n• Username: @${ctx.from.username}` : ''),
      { parse_mode: 'Markdown' }
    )
  );
}

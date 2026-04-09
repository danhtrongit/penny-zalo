/**
 * ==========================================
 * 🔑 /login Command
 * ==========================================
 * Generates a temporary dashboard access link.
 */

import type { Telegraf, Context } from 'telegraf';
import { Markup } from 'telegraf';
import { createSession } from '../database/repositories/session.repo.js';
import config from '../config/index.js';

export function registerLoginCommand(bot: Telegraf<Context>): void {
  bot.command('login', async (ctx) => {
    if (!ctx.dbUser) return;

    const { token, expiresAt } = await createSession(ctx.dbUser.id);
    const dashboardUrl = config.dashboard.url || `http://localhost:${config.dashboard.port}`;
    const link = `${dashboardUrl}?token=${token}`;

    const expiresDate = new Date(expiresAt);
    const timeStr = expiresDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    const isPublicUrl = link.startsWith('https://');

    const text =
      `🔐 *Link truy cập Dashboard*\n\n` +
      (isPublicUrl
        ? `👉 [Bấm vào đây để mở](${link})\n\n`
        : `👉 \`${link}\`\n\n`) +
      `⏰ Hết hạn lúc: ${timeStr}\n` +
      `⚠️ Link chỉ dành riêng cho bạn, không chia sẻ!`;

    if (isPublicUrl) {
      await ctx.reply(text, {
        parse_mode: 'Markdown',
        link_preview_options: { is_disabled: true },
        ...Markup.inlineKeyboard([
          Markup.button.url('🚀 Mở Dashboard', link),
        ]),
      });
    } else {
      await ctx.reply(text, {
        parse_mode: 'Markdown',
        link_preview_options: { is_disabled: true },
      });
    }
  });
}

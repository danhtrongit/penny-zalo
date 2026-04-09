/**
 * ==========================================
 * 👑 Admin Command
 * ==========================================
 * /admin — Admin broadcast messages/images
 * Only accessible by admin Telegram IDs.
 */

import type { Telegraf, Context } from 'telegraf';
import config from '../config/index.js';
import { broadcastText, broadcastImage } from '../services/broadcast.js';
import { getAllUsers } from '../database/repositories/user.repo.js';
import logger from '../utils/logger.js';

// Track pending broadcast state
const pendingBroadcast = new Map<number, {
  type: 'text' | 'image';
  target: 'all' | number[];
}>();

function isAdmin(ctx: Context): boolean {
  return config.adminIds.includes(ctx.from?.id || 0);
}

export function registerAdminCommand(bot: Telegraf): void {

  // /admin — Show admin panel
  bot.command('admin', async (ctx) => {
    if (!isAdmin(ctx)) return;

    const users = await getAllUsers();

    await ctx.reply(
      `👑 *Admin Panel*\n\n` +
      `📊 Tổng users: *${users.length}*\n\n` +
      `📢 *Các lệnh broadcast:*\n` +
      `/broadcast — Gửi tin nhắn tới tất cả users\n` +
      `/broadcastimg — Gửi hình tới tất cả users\n\n` +
      `➡️ Reply lệnh với nội dung để gửi.\n\n` +
      `📋 *Danh sách users:*\n` +
      users.map((u, i) => `${i + 1}. ${u.firstName || '?'} ${u.lastName || ''} (@${u.username || '?'}) — ID: \`${u.telegramId}\``).join('\n'),
      { parse_mode: 'Markdown' }
    );
  });

  // /broadcast [message] — Send text to all users
  bot.command('broadcast', async (ctx) => {
    if (!isAdmin(ctx)) return;

    const message = ctx.message.text.replace(/^\/broadcast\s*/, '').trim();

    if (!message) {
      pendingBroadcast.set(ctx.from!.id, { type: 'text', target: 'all' });
      await ctx.reply(
        '📝 Gửi tin nhắn tiếp theo để broadcast tới *tất cả users*.\n' +
        'Hoặc gửi /cancel để huỷ.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    await ctx.reply('📢 Đang gửi broadcast...');
    const result = await broadcastText(message);
    await ctx.reply(
      `✅ *Broadcast hoàn tất*\n\n` +
      `📨 Gửi: ${result.success}/${result.total}\n` +
      `❌ Lỗi: ${result.failed}` +
      (result.errors.length > 0 ? `\n\n⚠️ Chi tiết lỗi:\n${result.errors.map(e => `• User ${e.telegramId}: ${e.error}`).join('\n')}` : ''),
      { parse_mode: 'Markdown' }
    );
  });

  // /broadcastimg — Send image to all users
  bot.command('broadcastimg', async (ctx) => {
    if (!isAdmin(ctx)) return;

    pendingBroadcast.set(ctx.from!.id, { type: 'image', target: 'all' });
    await ctx.reply(
      '📸 Gửi *hình ảnh* tiếp theo để broadcast.\n' +
      'Có thể kèm caption. Hoặc /cancel để huỷ.',
      { parse_mode: 'Markdown' }
    );
  });

  // /cancel — Cancel pending broadcast
  bot.command('cancel', async (ctx) => {
    if (!isAdmin(ctx)) return;

    if (pendingBroadcast.has(ctx.from!.id)) {
      pendingBroadcast.delete(ctx.from!.id);
      await ctx.reply('❌ Đã huỷ broadcast.');
    }
  });

  // Handle pending broadcast messages (text)
  bot.on('text', async (ctx, next) => {
    if (!isAdmin(ctx)) return next();

    const pending = pendingBroadcast.get(ctx.from!.id);
    if (!pending || pending.type !== 'text') return next();

    pendingBroadcast.delete(ctx.from!.id);
    const message = ctx.message.text;

    await ctx.reply('📢 Đang gửi broadcast...');
    const result = await broadcastText(message, pending.target === 'all' ? undefined : pending.target);
    await ctx.reply(
      `✅ *Broadcast hoàn tất*\n📨 ${result.success}/${result.total} | ❌ ${result.failed}`,
      { parse_mode: 'Markdown' }
    );
  });

  // Handle pending broadcast photos
  bot.on('photo', async (ctx, next) => {
    if (!isAdmin(ctx)) return next();

    const pending = pendingBroadcast.get(ctx.from!.id);
    if (!pending || pending.type !== 'image') return next();

    pendingBroadcast.delete(ctx.from!.id);

    // Get highest resolution photo
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const fileLink = await ctx.telegram.getFileLink(photo.file_id);
    const caption = ctx.message.caption || '';

    await ctx.reply('📢 Đang gửi broadcast hình...');
    const result = await broadcastImage(
      fileLink.href,
      caption || undefined,
      pending.target === 'all' ? undefined : pending.target,
    );
    await ctx.reply(
      `✅ *Broadcast hình hoàn tất*\n📨 ${result.success}/${result.total} | ❌ ${result.failed}`,
      { parse_mode: 'Markdown' }
    );
  });
}

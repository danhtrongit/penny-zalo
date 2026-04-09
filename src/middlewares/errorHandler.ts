/**
 * ==========================================
 * 🛡️ Error Handler
 * ==========================================
 */

import type { Telegraf, Context } from 'telegraf';
import logger from '../utils/logger.js';

export function setupErrorHandler(bot: Telegraf<Context>): void {
  bot.catch((err: unknown, ctx: Context) => {
    const error = err as Error;
    logger.error(`❌ Unhandled error for ${ctx.updateType}:`, error.message);
    logger.debug('Stack trace:', error.stack);

    try {
      ctx.reply('😵 Có lỗi xảy ra! Vui lòng thử lại sau nhé.');
    } catch (replyError) {
      logger.error('Failed to send error reply:', (replyError as Error).message);
    }
  });
}

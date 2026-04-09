/**
 * ==========================================
 * 📊 Logging Middleware
 * ==========================================
 */

import type { Context, MiddlewareFn } from 'telegraf';
import logger from '../utils/logger.js';

const loggingMiddleware: MiddlewareFn<Context> = async (ctx, next) => {
  const start = Date.now();
  const user = ctx.from
    ? `${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim() + ` (${ctx.from.id})`
    : 'Unknown';

  logger.info(`📨 [${ctx.updateType}] from ${user}`);

  await next();

  const duration = Date.now() - start;
  logger.debug(`⏱️  Processed in ${duration}ms`);
};

export default loggingMiddleware;

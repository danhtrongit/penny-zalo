/**
 * ==========================================
 * 🔐 Auth Middleware
 * ==========================================
 * Auto-creates user and injects user data
 * into Telegraf context for every request.
 */

import type { Context, MiddlewareFn } from 'telegraf';
import { findOrCreateUser } from '../database/repositories/user.repo.js';
import logger from '../utils/logger.js';

// Extend Telegraf context with user data
declare module 'telegraf' {
  interface Context {
    dbUser: {
      id: number;
      telegramId: number;
      firstName: string;
      lastName: string | null;
      username: string | null;
    };
  }
}

const authMiddleware: MiddlewareFn<Context> = async (ctx, next) => {
  if (!ctx.from) {
    return next();
  }

  try {
    const user = await findOrCreateUser({
      telegramId: ctx.from.id,
      firstName: ctx.from.first_name || '',
      lastName: ctx.from.last_name,
      username: ctx.from.username,
    });

    ctx.dbUser = user;
  } catch (error) {
    logger.error('Auth middleware error:', (error as Error).message);
  }

  return next();
};

export default authMiddleware;

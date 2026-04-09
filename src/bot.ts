/**
 * ==========================================
 * 🤖 Bot Factory
 * ==========================================
 */

import { Telegraf } from 'telegraf';
import config from './config/index.js';
import logger from './utils/logger.js';

// Middlewares
import loggingMiddleware from './middlewares/logging.js';
import authMiddleware from './middlewares/auth.js';
import { setupErrorHandler } from './middlewares/errorHandler.js';

// Commands & Handlers
import { registerAllCommands } from './commands/index.js';
import { registerMessageHandler } from './handlers/message.js';

export function createBot(token?: string): Telegraf {
  const botToken = token || config.telegram.token;
  logger.info('🔧 Creating bot instance...');

  const bot = new Telegraf(botToken);

  // --- Middlewares (order matters!) ---
  bot.use(loggingMiddleware);
  bot.use(authMiddleware);       // ← injects ctx.dbUser

  // --- Commands ---
  registerAllCommands(bot);

  // --- Message Handlers ---
  registerMessageHandler(bot);

  // --- Error Handler (must be last) ---
  setupErrorHandler(bot);

  logger.info('✅ Bot configured successfully');

  return bot;
}

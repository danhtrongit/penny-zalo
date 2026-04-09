/**
 * ==========================================
 * 🚀 PENNY ZALO BOT - Entry Point
 * ==========================================
 */

import { initDatabase } from './database/connection.js';
import { startDashboardServer } from './dashboard/server.js';
import config from './config/index.js';
import logger from './utils/logger.js';
import { ZaloBotClient } from './zalo/client.js';
import { PennyZaloRuntime } from './zalo/runtime.js';

async function main(): Promise<void> {
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║      🤖 PENNY ZALO BOT v1.0.0       ║');
  console.log('  ║     Trợ lý chi tiêu cá nhân         ║');
  console.log('  ║    Zalo + Dashboard + MySQL         ║');
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');

  await initDatabase();

  logger.info(`📋 Bot Name: ${config.bot.name}`);
  logger.info(`🧠 AI Model: ${config.ai.model}`);
  logger.info(`🌐 AI Proxy: ${config.ai.baseURL}`);
  logger.info(`🌍 Language: ${config.bot.language}`);
  logger.info('⚡ Features: Zalo chat + OCR + report + dashboard');

  const app = startDashboardServer();
  const client = new ZaloBotClient(config.zalo.token);
  const runtime = new PennyZaloRuntime(client);

  await runtime.bootstrap(app);

  const shutdown = (signal: string) => {
    logger.info(`👋 Received ${signal}. Shutting down...`);
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error) => {
  logger.error(`💥 Failed to start Penny Zalo: ${(error as Error).message}`);
  process.exit(1);
});

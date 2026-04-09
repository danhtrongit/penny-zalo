/**
 * ==========================================
 * 🌐 Dashboard Express Server
 * ==========================================
 * Runs alongside the Telegram bot.
 * Returns the Express app for webhook mounting.
 */

import express, { type Express } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config/index.js';
import apiRouter from './api.js';
import logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function startDashboardServer(): Express {
  const app = express();
  const port = config.dashboard.port;

  // Middlewares
  app.use(cors());
  app.use(express.json());

  // API routes
  app.use('/api', apiRouter);

  // Serve Vite frontend (production build)
  const distPath = path.resolve(__dirname, '../../dashboard/dist');
  app.use(express.static(distPath));

  // SPA fallback (Express v5 syntax)
  app.get('/{*path}', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  app.listen(port, '0.0.0.0', () => {
    logger.info(`🌐 Dashboard: http://0.0.0.0:${port}`);
  });

  return app;
}

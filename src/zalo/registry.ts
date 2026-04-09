/**
 * ==========================================
 * 📌 Zalo Client Registry
 * ==========================================
 */

import type { ZaloBotClient } from './client.js';

let primaryClient: ZaloBotClient | null = null;

export function registerZaloClient(client: ZaloBotClient): void {
  primaryClient = client;
}

export function getZaloClient(): ZaloBotClient | null {
  return primaryClient;
}

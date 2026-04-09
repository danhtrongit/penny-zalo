/**
 * ==========================================
 * 📡 Bot Instances Registry
 * ==========================================
 * Stores references to all active Telegraf instances
 * so services (broadcast, etc.) can send messages.
 */

import type { Telegraf } from 'telegraf';

const instances: Telegraf[] = [];

export function registerBotInstance(bot: Telegraf): void {
  instances.push(bot);
}

export function getBotInstances(): Telegraf[] {
  return instances;
}

/**
 * Get the first bot instance (primary)
 */
export function getPrimaryBot(): Telegraf | undefined {
  return instances[0];
}

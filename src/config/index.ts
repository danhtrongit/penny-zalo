/**
 * ==========================================
 * 🔧 Centralized Configuration
 * ==========================================
 */

import 'dotenv/config';

export interface ZaloConfig {
  token: string;
  webhookDomain: string;
  webhookPath: string;
  webhookSecretToken: string;
  pollingTimeoutSeconds: number;
}

export interface AIConfig {
  baseURL: string;
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface BotConfig {
  name: string;
  language: string;
  migrationHelpText: string;
}

export interface DashboardConfig {
  port: number;
  url: string;
}

export interface AppConfig {
  zalo: ZaloConfig;
  ai: AIConfig;
  bot: BotConfig;
  dashboard: DashboardConfig;
  logLevel: string;
  adminUserIds: number[];
  adminExternalIds: string[];
}

function parseCsvNumbers(value: string): number[] {
  return value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0);
}

function parseCsvStrings(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const config: AppConfig = {
  zalo: {
    token: process.env.ZALO_BOT_TOKEN || process.env.BOT_TOKEN || '',
    webhookDomain: process.env.WEBHOOK_DOMAIN || '',
    webhookPath: process.env.WEBHOOK_PATH || '/webhook/zalo',
    webhookSecretToken: process.env.WEBHOOK_SECRET_TOKEN || process.env.ZALO_WEBHOOK_SECRET_TOKEN || '',
    pollingTimeoutSeconds: parseInt(process.env.ZALO_POLLING_TIMEOUT || '25', 10),
  },
  ai: {
    baseURL: process.env.AI_BASE_URL || process.env.AI_PROXY_URL || '',
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || 'gemini-2.5-flash-lite',
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || '2048', 10),
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
  },
  bot: {
    name: process.env.BOT_NAME || 'Penny',
    language: process.env.BOT_LANGUAGE || 'vi',
    migrationHelpText:
      process.env.ZALO_MIGRATION_HELP ||
      'Nếu bạn từng dùng Penny trên Telegram, hãy mở Dashboard bằng /login ở bot cũ rồi tạo mã liên kết Zalo trong phần Cài đặt.',
  },
  dashboard: {
    port: parseInt(process.env.DASHBOARD_PORT || '3000', 10),
    url: (process.env.DASHBOARD_URL || '').replace(/\/$/, ''),
  },
  logLevel: process.env.LOG_LEVEL || 'info',
  adminUserIds: parseCsvNumbers(process.env.ADMIN_USER_IDS || ''),
  adminExternalIds: [
    ...parseCsvStrings(process.env.ZALO_ADMIN_IDS || ''),
    ...parseCsvStrings(process.env.ADMIN_IDS || ''),
  ],
};

const required: Array<{ key: string; value: string }> = [
  { key: 'ZALO_BOT_TOKEN', value: config.zalo.token },
  { key: 'AI_API_KEY', value: config.ai.apiKey },
  { key: 'AI_BASE_URL', value: config.ai.baseURL },
];

const missing = required.filter((item) => !item.value);

if (missing.length > 0) {
  const keys = missing.map((item) => item.key).join(', ');
  console.error(`❌ Missing required environment variables: ${keys}`);
  console.error('📝 Please check your .env file. See .env.example for reference.');
  process.exit(1);
}

export default config;

/**
 * ==========================================
 * 📋 Logger Utility
 * ==========================================
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLevel = LOG_LEVELS[(process.env.LOG_LEVEL as LogLevel) ?? 'info'] ?? LOG_LEVELS.info;

function formatTimestamp(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function log(level: LogLevel, ...args: unknown[]): void {
  if (LOG_LEVELS[level] <= currentLevel) {
    const prefix = `[${formatTimestamp()}] [${level.toUpperCase()}]`;
    const method = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
    console[method](prefix, ...args);
  }
}

const logger = {
  error: (...args: unknown[]) => log('error', ...args),
  warn: (...args: unknown[]) => log('warn', ...args),
  info: (...args: unknown[]) => log('info', ...args),
  debug: (...args: unknown[]) => log('debug', ...args),
};

export default logger;

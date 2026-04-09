import logger from '../utils/logger.js';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_MAX_AGE_DAYS = 366;

function buildUtcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

function parseImportedDate(rawDate: string, referenceDate: Date): Date | null {
  const value = rawDate.trim();
  if (!value) return null;

  const isoMatch = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    return buildUtcDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
  }

  const dmyShort = value.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2})$/);
  if (dmyShort) {
    const year = 2000 + Number(dmyShort[3]);
    return buildUtcDate(year, Number(dmyShort[2]), Number(dmyShort[1]));
  }

  const dmyLong = value.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dmyLong) {
    return buildUtcDate(Number(dmyLong[3]), Number(dmyLong[2]), Number(dmyLong[1]));
  }

  const fallback = new Date(value);
  if (!Number.isNaN(fallback.getTime())) {
    return fallback;
  }

  logger.warn(`⚠️ Could not parse imported transaction date: "${rawDate}"`);
  return null;
}

export function normalizeImportedTransactionDate(
  rawDate: string | null | undefined,
  options?: {
    referenceDate?: Date;
    maxAgeDays?: number;
  },
): string {
  const referenceDate = options?.referenceDate || new Date();
  const maxAgeDays = options?.maxAgeDays || DEFAULT_MAX_AGE_DAYS;

  if (!rawDate) {
    return referenceDate.toISOString();
  }

  const parsed = parseImportedDate(rawDate, referenceDate);
  if (!parsed) {
    return referenceDate.toISOString();
  }

  const diffMs = referenceDate.getTime() - parsed.getTime();
  const tooOld = diffMs > maxAgeDays * ONE_DAY_MS;
  const tooFuture = diffMs < -ONE_DAY_MS;

  if (tooOld || tooFuture) {
    logger.warn(
      `⚠️ Suspicious imported date "${rawDate}" resolved to ${parsed.toISOString()}, fallback to import time ${referenceDate.toISOString()}`,
    );
    return referenceDate.toISOString();
  }

  return parsed.toISOString();
}

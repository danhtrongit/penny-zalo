/**
 * ==========================================
 * 📅 Date Utility
 * ==========================================
 * Resolves relative Vietnamese date expressions
 * to actual Date objects.
 */

/**
 * Resolve a relative date string to a Date object.
 * All dates use Vietnam timezone (UTC+7).
 */
export function resolveDate(input?: string): Date {
  const now = new Date();

  if (!input) return now;

  const lower = input.trim().toLowerCase();

  if (lower === 'hôm nay' || lower === 'nay' || lower === 'today') {
    return now;
  }

  if (lower === 'hôm qua' || lower === 'qua' || lower === 'yesterday') {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return d;
  }

  if (lower === 'hôm kia' || lower === 'kia') {
    const d = new Date(now);
    d.setDate(d.getDate() - 2);
    return d;
  }

  // Try DD/MM/YYYY or DD/MM format
  const dateMatch = input.trim().match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
  if (dateMatch) {
    const day = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10) - 1; // JS months are 0-indexed
    const year = dateMatch[3] ? parseInt(dateMatch[3], 10) : now.getFullYear();
    const d = new Date(year, month, day, now.getHours(), now.getMinutes());
    if (!isNaN(d.getTime()) && d.getDate() === day) {
      return d;
    }
  }

  // Try parsing as ISO date
  const parsed = new Date(input);
  if (!isNaN(parsed.getTime())) return parsed;

  return now;
}

/**
 * Get the start of current week (Monday)
 */
export function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Get the start of current month
 */
export function getMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/**
 * Get the start of today
 */
export function getTodayStart(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

/**
 * Format date to Vietnamese short format
 * @example "14/03" or "14/03/2026"
 */
export function formatDateShort(date: Date, includeYear = false): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  if (includeYear) {
    return `${day}/${month}/${date.getFullYear()}`;
  }
  return `${day}/${month}`;
}

/**
 * Format date to Vietnamese display
 * @example "14/03/2026 09:30"
 */
export function formatDateTime(date: Date): string {
  const d = formatDateShort(date, true);
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${d} ${h}:${m}`;
}

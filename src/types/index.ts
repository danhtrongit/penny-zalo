/**
 * ==========================================
 * 📐 Shared TypeScript Types
 * ==========================================
 */

// --- Expense Categories ---
export const CATEGORIES = [
  'Ăn uống',
  'Đi chợ',
  'Di chuyển',
  'Mua sắm',
  'Sinh hoạt',
  'Giải trí',
  'Sức khỏe',
  'Học tập',
  'Quà tặng',
  'Tiết kiệm',
  'Đầu tư',
  'Khác',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_EMOJI: Record<Category, string> = {
  'Ăn uống': '🍜',
  'Đi chợ': '🛒',
  'Di chuyển': '🚗',
  'Mua sắm': '🛍️',
  'Sinh hoạt': '🏠',
  'Giải trí': '🎮',
  'Sức khỏe': '💊',
  'Học tập': '📚',
  'Quà tặng': '🎁',
  'Tiết kiệm': '💰',
  'Đầu tư': '📈',
  'Khác': '📦',
};

// --- Transaction Source ---
export type TransactionSource = 'text' | 'image' | 'pdf';

// --- Budget Period ---
export type BudgetPeriod = 'week' | 'month';

// --- Persona Presets ---
export const PERSONA_PRESETS = [
  'bạn thân',
  'trợ lý',
  'nội trợ',
  'huấn luyện viên',
  'hề',
] as const;

export type PersonaPreset = (typeof PERSONA_PRESETS)[number];

// --- AI Parsed Expense ---
export interface ParsedExpenseItem {
  amount: number;
  description: string;
  category: Category;
  date?: string;
}

export interface ParsedExpense {
  items: ParsedExpenseItem[];
  date?: string; // ISO date or relative like "hôm qua"
  is_expense: boolean;
}

// --- AI Intent Detection ---
export type UserIntent =
  | 'expense'
  | 'set_budget'
  | 'view_report'
  | 'view_history'
  | 'update_expense'
  | 'greeting'
  | 'general_chat';

export interface DetectedIntent {
  intent: UserIntent;
  expense?: ParsedExpense;
  budget?: {
    period: BudgetPeriod;
    amount: number;
  };
  history_period?: string;
}

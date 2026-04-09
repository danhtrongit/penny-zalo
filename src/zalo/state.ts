/**
 * ==========================================
 * 🧭 Zalo Conversation State
 * ==========================================
 */

import type { BudgetPeriod, PersonaPreset } from '../types/index.js';

export interface DuplicateExpensePayload {
  amount: number;
  description: string;
  category: string;
  rawInput: string;
  date?: string;
}

export type PendingState =
  | { type: 'onboarding_preset'; expiresAt: number }
  | { type: 'onboarding_name'; preset: PersonaPreset; expiresAt: number }
  | { type: 'onboarding_gender'; expiresAt: number }
  | { type: 'budget_period'; expiresAt: number }
  | { type: 'budget_amount'; period: BudgetPeriod; expiresAt: number }
  | { type: 'duplicate_confirm'; expense: DuplicateExpensePayload; expiresAt: number }
  | { type: 'admin_broadcast_text'; expiresAt: number }
  | { type: 'admin_broadcast_image'; expiresAt: number };

export type PendingStateInput =
  | { type: 'onboarding_preset' }
  | { type: 'onboarding_name'; preset: PersonaPreset }
  | { type: 'onboarding_gender' }
  | { type: 'budget_period' }
  | { type: 'budget_amount'; period: BudgetPeriod }
  | { type: 'duplicate_confirm'; expense: DuplicateExpensePayload }
  | { type: 'admin_broadcast_text' }
  | { type: 'admin_broadcast_image' };

const stateStore = new Map<number, PendingState>();

export function setPendingState(
  userId: number,
  state: PendingStateInput,
  ttlMs = 15 * 60 * 1000,
): void {
  stateStore.set(userId, {
    ...state,
    expiresAt: Date.now() + ttlMs,
  } as PendingState);
}

export function getPendingState(userId: number): PendingState | null {
  const state = stateStore.get(userId);
  if (!state) {
    return null;
  }

  if (state.expiresAt <= Date.now()) {
    stateStore.delete(userId);
    return null;
  }

  return state;
}

export function clearPendingState(userId: number): void {
  stateStore.delete(userId);
}

setInterval(() => {
  const now = Date.now();
  for (const [userId, state] of stateStore) {
    if (state.expiresAt <= now) {
      stateStore.delete(userId);
    }
  }
}, 60_000);

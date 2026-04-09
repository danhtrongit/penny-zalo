import type { ZaloEventPayload } from './types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isWebhookEventPayload(value: unknown): value is ZaloEventPayload {
  return isRecord(value) && typeof value.event_name === 'string';
}

export function extractWebhookEvent(payload: unknown): ZaloEventPayload | null {
  if (isWebhookEventPayload(payload)) {
    return payload;
  }

  if (isRecord(payload) && isWebhookEventPayload(payload.result)) {
    return payload.result;
  }

  return null;
}

import test from 'node:test';
import assert from 'node:assert/strict';

import { extractWebhookEvent } from './webhook.js';

test('extractWebhookEvent returns direct webhook event payloads', () => {
  const payload = {
    event_name: 'message.text.received',
    message: {
      from: {
        id: 'user-1',
        display_name: 'Ted',
        is_bot: false,
      },
      chat: {
        id: 'chat-1',
        chat_type: 'PRIVATE',
      },
      text: 'Xin chao',
      message_id: 'msg-1',
      date: 1750316131602,
    },
  };

  assert.deepEqual(extractWebhookEvent(payload), payload);
});

test('extractWebhookEvent returns nested webhook event payloads', () => {
  const event = {
    event_name: 'message.text.received',
    message: {
      from: {
        id: 'user-2',
        display_name: 'Trang',
        is_bot: false,
      },
      chat: {
        id: 'chat-2',
        chat_type: 'PRIVATE',
      },
      text: '/start',
      message_id: 'msg-2',
      date: 1750316131603,
    },
  };

  assert.deepEqual(extractWebhookEvent({ ok: true, result: event }), event);
});

test('extractWebhookEvent preserves document-style webhook event payloads', () => {
  const event = {
    event_name: 'message.document.received',
    message: {
      from: {
        id: 'user-3',
        display_name: 'Linh',
        is_bot: false,
      },
      chat: {
        id: 'chat-3',
        chat_type: 'PRIVATE',
      },
      document: 'https://files.example.com/invoice',
      file_name: 'invoice.pdf',
      mime_type: 'application/pdf',
      message_id: 'msg-3',
      date: 1750316131604,
    },
  };

  assert.deepEqual(extractWebhookEvent({ ok: true, result: event }), event);
});

test('extractWebhookEvent returns null for invalid payloads', () => {
  assert.equal(extractWebhookEvent({ ok: true }), null);
  assert.equal(extractWebhookEvent(null), null);
  assert.equal(extractWebhookEvent('bad-payload'), null);
});

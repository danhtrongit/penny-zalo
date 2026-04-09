import test from 'node:test';
import assert from 'node:assert/strict';

test('PennyZaloRuntime routes document events to PDF handler', async () => {
  process.env.ZALO_BOT_TOKEN ||= 'test-token';
  process.env.AI_API_KEY ||= 'test-key';
  process.env.AI_BASE_URL ||= 'https://example.com';
  process.env.DATABASE_URL ||= 'mysql://user:pass@127.0.0.1:3306/penny_test';

  const { PennyZaloRuntime } = await import('./runtime.js');

  const client = {
    sendMessage: async () => undefined,
    sendChatAction: async () => undefined,
  } as any;

  const runtime = new PennyZaloRuntime(client);
  let handled = 0;

  runtime['handlePdfMessage'] = async () => {
    handled += 1;
  };

  runtime['reply'] = async () => undefined;

  await runtime['handleEvent']({
    event_name: 'message.document.received',
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
      document: 'https://files.example.com/invoice',
      file_name: 'invoice.pdf',
      mime_type: 'application/pdf',
      message_id: 'msg-pdf-1',
      date: 1,
    },
  } as any);

  assert.equal(handled, 1);
});

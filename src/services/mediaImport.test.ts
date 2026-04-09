import test from 'node:test';
import assert from 'node:assert/strict';

import { detectImportedMediaDuplicate, mediaImportRepo } from './mediaImport.js';

test('detectImportedMediaDuplicate returns existing transaction when same media was imported before', async (t) => {
  const existing = {
    id: 123,
    userId: 9,
    amount: 89000,
    description: 'COFFEE BINBO',
    category: 'Ăn uống',
    rawInput: '',
    source: 'image',
    mediaPath: 'receipts/9_1.jpg',
    mediaHash: 'abc',
    transactionDate: new Date('2026-04-09T10:29:58.000Z'),
    status: 'confirmed',
    createdAt: new Date('2026-04-09T10:29:58.000Z'),
  };

  t.mock.method(mediaImportRepo, 'getTransactionsByMediaHash', async () => [existing as any]);

  const result = await detectImportedMediaDuplicate(9, Buffer.from('same-file'));

  assert.equal(result.existing?.id, 123);
  assert.match(result.mediaHash, /^[a-f0-9]{64}$/);
});

test('detectImportedMediaDuplicate returns null when media hash is new', async (t) => {
  t.mock.method(mediaImportRepo, 'getTransactionsByMediaHash', async () => []);

  const result = await detectImportedMediaDuplicate(9, Buffer.from('new-file'));

  assert.equal(result.existing, null);
  assert.match(result.mediaHash, /^[a-f0-9]{64}$/);
});

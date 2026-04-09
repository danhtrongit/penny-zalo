import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeImportedTransactionDate } from './importedDate.js';

test('normalizeImportedTransactionDate falls back to import time for suspiciously old OCR dates', () => {
  const referenceDate = new Date('2026-04-09T10:35:07.000Z');

  assert.equal(
    normalizeImportedTransactionDate('09/12/17', { referenceDate }),
    referenceDate.toISOString(),
  );

  assert.equal(
    normalizeImportedTransactionDate('13/03/2014', { referenceDate }),
    referenceDate.toISOString(),
  );
});

test('normalizeImportedTransactionDate preserves recent receipt dates', () => {
  const referenceDate = new Date('2026-04-09T10:35:07.000Z');

  assert.equal(
    normalizeImportedTransactionDate('2026-04-08', { referenceDate }),
    new Date('2026-04-08T00:00:00.000Z').toISOString(),
  );
});

test('normalizeImportedTransactionDate falls back to import time for future dates', () => {
  const referenceDate = new Date('2026-04-09T10:35:07.000Z');

  assert.equal(
    normalizeImportedTransactionDate('2026-12-09', { referenceDate }),
    referenceDate.toISOString(),
  );
});

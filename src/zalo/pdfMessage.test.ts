import test from 'node:test';
import assert from 'node:assert/strict';

import { extractPdfUrlFromMessage, isLikelyPdfSource } from './pdfMessage.js';

test('extractPdfUrlFromMessage prefers direct document url', () => {
  assert.equal(
    extractPdfUrlFromMessage({
      document: 'https://files.example.com/invoice',
      url: 'https://files.example.com/other.pdf',
      text: 'https://files.example.com/fallback.pdf',
    }),
    'https://files.example.com/invoice',
  );
});

test('extractPdfUrlFromMessage falls back to pdf links in text and caption', () => {
  assert.equal(
    extractPdfUrlFromMessage({
      text: 'xem file https://a.example.com/hoa-don.pdf nhé',
    }),
    'https://a.example.com/hoa-don.pdf',
  );

  assert.equal(
    extractPdfUrlFromMessage({
      caption: 'Đây là bill https://a.example.com/bill.pdf)',
    }),
    'https://a.example.com/bill.pdf',
  );
});

test('extractPdfUrlFromMessage uses message.url when mime type says pdf', () => {
  assert.equal(
    extractPdfUrlFromMessage({
      url: 'https://files.example.com/download?id=123',
      mime_type: 'application/pdf',
    }),
    'https://files.example.com/download?id=123',
  );
});

test('isLikelyPdfSource accepts pdf mime, filename, or url suffix', () => {
  assert.equal(isLikelyPdfSource({ contentType: 'application/pdf' }), true);
  assert.equal(isLikelyPdfSource({ mimeType: 'application/pdf' }), true);
  assert.equal(isLikelyPdfSource({ fileName: 'invoice.pdf' }), true);
  assert.equal(isLikelyPdfSource({ sourceUrl: 'https://a.example.com/file.pdf' }), true);
  assert.equal(isLikelyPdfSource({ contentType: 'image/jpeg', fileName: 'photo.jpg' }), false);
});

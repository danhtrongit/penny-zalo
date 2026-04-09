import test from 'node:test';
import assert from 'node:assert/strict';

import { extractImageUrlFromMessage } from './imageMessage.js';

test('extractImageUrlFromMessage prefers photo field', () => {
  assert.equal(
    extractImageUrlFromMessage({
      photo: 'https://files.example.com/photo.jpg',
      url: 'https://files.example.com/fallback.jpg',
    }),
    'https://files.example.com/photo.jpg',
  );
});

test('extractImageUrlFromMessage falls back to url field', () => {
  assert.equal(
    extractImageUrlFromMessage({
      url: 'https://files.example.com/photo-from-url.jpg',
    }),
    'https://files.example.com/photo-from-url.jpg',
  );
});

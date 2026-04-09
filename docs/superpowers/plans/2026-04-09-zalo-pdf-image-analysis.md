# Zalo PDF/Image Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable Penny Zalo to analyze inbound images and PDFs with the existing OCR/PDF services while keeping the Zalo runtime changes minimal.

**Architecture:** Extend Zalo payload typing for likely PDF/file events, add a small pure helper to resolve PDF URLs and validate PDF-like sources, then wire the runtime to download and process PDFs through the existing `processPDF()` service. Image handling stays on the current path.

**Tech Stack:** TypeScript, Node.js built-in test runner, tsx, existing Zalo runtime and Gemini-backed OCR/PDF services

---

### Task 1: Add failing tests for PDF source resolution

**Files:**
- Create: `src/zalo/pdfMessage.test.ts`
- Create: `src/zalo/pdfMessage.ts`

- [ ] **Step 1: Write the failing test**

```ts
test('extractPdfUrl prefers direct document url over other fields', () => {
  assert.equal(
    extractPdfUrlFromMessage({
      document: 'https://files.example.com/invoice',
      url: 'https://files.example.com/other.pdf',
      text: 'https://files.example.com/fallback.pdf',
    }),
    'https://files.example.com/invoice',
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test src/zalo/pdfMessage.test.ts`
Expected: FAIL because `src/zalo/pdfMessage.ts` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
export function extractPdfUrlFromMessage(message: {
  document?: string;
  url?: string;
  text?: string;
  caption?: string;
}): string | null {
  return message.document || null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test src/zalo/pdfMessage.test.ts`
Expected: PASS for the first case, with later cases still to add.

- [ ] **Step 5: Commit**

```bash
git add src/zalo/pdfMessage.ts src/zalo/pdfMessage.test.ts
git commit -m "test: add pdf message resolution tests"
```

### Task 2: Cover fallback parsing and PDF validation

**Files:**
- Modify: `src/zalo/pdfMessage.ts`
- Modify: `src/zalo/pdfMessage.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
test('extractPdfUrl falls back to pdf links in text and caption', () => {
  assert.equal(
    extractPdfUrlFromMessage({ text: 'xem file https://a.example.com/hoa-don.pdf nhé' }),
    'https://a.example.com/hoa-don.pdf',
  );
  assert.equal(
    extractPdfUrlFromMessage({ caption: 'https://a.example.com/bill.pdf)' }),
    'https://a.example.com/bill.pdf',
  );
});

test('isLikelyPdfSource accepts pdf mime, filename, or url suffix', () => {
  assert.equal(isLikelyPdfSource({ contentType: 'application/pdf' }), true);
  assert.equal(isLikelyPdfSource({ fileName: 'invoice.pdf' }), true);
  assert.equal(isLikelyPdfSource({ sourceUrl: 'https://a.example.com/file.pdf' }), true);
  assert.equal(isLikelyPdfSource({ contentType: 'image/jpeg', fileName: 'photo.jpg' }), false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --import tsx --test src/zalo/pdfMessage.test.ts`
Expected: FAIL on fallback parsing and validation assertions.

- [ ] **Step 3: Write minimal implementation**

```ts
export function isLikelyPdfSource(input: {
  contentType?: string | null;
  fileName?: string | null;
  sourceUrl?: string | null;
  mimeType?: string | null;
}): boolean {
  return Boolean(
    input.contentType?.toLowerCase().includes('application/pdf') ||
    input.mimeType?.toLowerCase().includes('application/pdf') ||
    input.fileName?.toLowerCase().endsWith('.pdf') ||
    input.sourceUrl?.toLowerCase().match(/\.pdf([?#].*)?$/),
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --import tsx --test src/zalo/pdfMessage.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/zalo/pdfMessage.ts src/zalo/pdfMessage.test.ts
git commit -m "test: cover pdf fallback parsing"
```

### Task 3: Wire PDF support into the Zalo runtime

**Files:**
- Modify: `src/zalo/types.ts`
- Modify: `src/zalo/runtime.ts`
- Modify: `src/zalo/webhook.test.ts`
- Modify: `src/zalo/pdfMessage.ts`
- Test: `src/zalo/pdfMessage.test.ts`

- [ ] **Step 1: Write the failing integration-oriented test**

```ts
test('extractWebhookEvent keeps document-style events intact', () => {
  const payload = {
    ok: true,
    result: {
      event_name: 'message.document.received',
      message: {
        from: { id: 'u1', display_name: 'A', is_bot: false },
        chat: { id: 'c1', chat_type: 'PRIVATE' },
        document: 'https://files.example.com/invoice',
        file_name: 'invoice.pdf',
        mime_type: 'application/pdf',
        message_id: 'm1',
        date: 1,
      },
    },
  };

  assert.equal(extractWebhookEvent(payload)?.event_name, 'message.document.received');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --import tsx --test src/zalo/webhook.test.ts src/zalo/pdfMessage.test.ts`
Expected: FAIL because types do not yet allow the new event.

- [ ] **Step 3: Write minimal implementation**

```ts
switch (event.event_name) {
  case 'message.document.received':
  case 'message.file.received':
  case 'message.pdf.received':
    await this.handlePdfMessage(message);
    break;
}
```

- [ ] **Step 4: Run tests and typecheck**

Run: `node --import tsx --test src/zalo/webhook.test.ts src/zalo/pdfMessage.test.ts`
Expected: PASS

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/zalo/types.ts src/zalo/runtime.ts src/zalo/webhook.test.ts src/zalo/pdfMessage.ts src/zalo/pdfMessage.test.ts
git commit -m "feat: add pdf analysis for zalo messages"
```

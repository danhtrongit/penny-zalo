/**
 * ==========================================
 * 📝 Text Helpers
 * ==========================================
 */

const MARKDOWN_CONTROL = /[*_`]/g;

export function stripMarkdown(input: string): string {
  return input.replace(MARKDOWN_CONTROL, '').trim();
}

export function splitLongText(input: string, chunkSize = 1900): string[] {
  const text = input.trim();
  if (!text) return [];
  if (text.length <= chunkSize) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > chunkSize) {
    let splitAt = remaining.lastIndexOf('\n', chunkSize);
    if (splitAt < chunkSize * 0.5) {
      splitAt = remaining.lastIndexOf(' ', chunkSize);
    }
    if (splitAt < chunkSize * 0.5) {
      splitAt = chunkSize;
    }

    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  if (remaining) {
    chunks.push(remaining);
  }

  return chunks;
}

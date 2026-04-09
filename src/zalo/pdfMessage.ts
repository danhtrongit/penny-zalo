interface PdfCandidateMessage {
  document?: string;
  url?: string;
  text?: string;
  caption?: string;
  mime_type?: string;
}

const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;

function normalizeUrl(candidate: string): string {
  return candidate.replace(/[),.;!?]+$/g, '');
}

function extractUrls(value?: string): string[] {
  if (!value) {
    return [];
  }

  return Array.from(value.match(URL_PATTERN) || [], normalizeUrl);
}

function isPdfUrl(value?: string | null): boolean {
  return Boolean(value && /\.pdf(?:[?#].*)?$/i.test(value));
}

export function extractPdfUrlFromMessage(message: PdfCandidateMessage): string | null {
  if (message.document) {
    return message.document;
  }

  if (message.url && (isPdfUrl(message.url) || isLikelyPdfSource({
    sourceUrl: message.url,
    mimeType: message.mime_type,
  }))) {
    return message.url;
  }

  for (const field of [message.text, message.caption]) {
    const match = extractUrls(field).find((url) => isPdfUrl(url));
    if (match) {
      return match;
    }
  }

  return null;
}

export function isLikelyPdfSource(input: {
  contentType?: string | null;
  fileName?: string | null;
  sourceUrl?: string | null;
  mimeType?: string | null;
}): boolean {
  const contentType = input.contentType?.toLowerCase() || '';
  const fileName = input.fileName?.toLowerCase() || '';
  const sourceUrl = input.sourceUrl?.toLowerCase() || '';
  const mimeType = input.mimeType?.toLowerCase() || '';

  return (
    contentType.includes('application/pdf') ||
    mimeType.includes('application/pdf') ||
    fileName.endsWith('.pdf') ||
    isPdfUrl(sourceUrl)
  );
}

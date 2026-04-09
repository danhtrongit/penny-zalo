interface ImageCandidateMessage {
  photo?: string;
  url?: string;
}

export function extractImageUrlFromMessage(message: ImageCandidateMessage): string | null {
  return message.photo || message.url || null;
}

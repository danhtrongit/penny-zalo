interface ImageCandidateMessage {
  photo?: string;
  photo_url?: string;
  url?: string;
}

export function extractImageUrlFromMessage(message: ImageCandidateMessage): string | null {
  return message.photo || message.photo_url || message.url || null;
}

/**
 * ==========================================
 * 💬 Zalo Bot Types
 * ==========================================
 */

export type ZaloEventName =
  | 'message.text.received'
  | 'message.image.received'
  | 'message.sticker.received'
  | 'message.unsupported.received';

export interface ZaloMessageAuthor {
  id: string;
  display_name: string;
  is_bot: boolean;
}

export interface ZaloChat {
  id: string;
  chat_type: 'PRIVATE' | 'GROUP';
}

export interface ZaloMessage {
  from: ZaloMessageAuthor;
  chat: ZaloChat;
  text?: string;
  photo?: string;
  caption?: string;
  sticker?: string;
  url?: string;
  message_id: string;
  date: number;
}

export interface ZaloEventPayload {
  event_name: ZaloEventName;
  message?: ZaloMessage;
}

export interface ZaloWebhookUpdate {
  ok: true;
  result: ZaloEventPayload;
}

export interface ZaloApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

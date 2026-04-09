/**
 * ==========================================
 * 🌐 Zalo HTTP API Client
 * ==========================================
 */

import fs from 'fs';
import path from 'path';
import type { ZaloApiResponse, ZaloEventPayload } from './types.js';

type RequestPayload =
  | Record<string, string | number | boolean | undefined>
  | FormData
  | undefined;

interface SendPhotoBuffer {
  buffer: Buffer;
  filename?: string;
  mimeType?: string;
}

export class ZaloBotClient {
  private readonly baseUrl: string;

  constructor(private readonly token: string) {
    this.baseUrl = `https://bot-api.zaloplatforms.com/bot${token}`;
  }

  async getMe() {
    return this.request<{
      id: string;
      account_name: string;
      account_type: string;
      can_join_groups: boolean;
      display_name?: string;
    }>('getMe');
  }

  async getUpdates(timeoutSeconds = 25): Promise<ZaloEventPayload[]> {
    const result = await this.request<ZaloEventPayload[] | ZaloEventPayload | undefined>('getUpdates', {
      timeout: String(timeoutSeconds),
    });

    if (!result) {
      return [];
    }

    return Array.isArray(result) ? result : [result];
  }

  async setWebhook(url: string, secretToken: string) {
    return this.request('setWebhook', {
      url,
      secret_token: secretToken,
    });
  }

  async sendMessage(chatId: string, text: string) {
    return this.request<{ message_id: string; date: number }>('sendMessage', {
      chat_id: chatId,
      text,
    });
  }

  async sendChatAction(chatId: string, action: 'typing' | 'upload_photo' = 'typing') {
    return this.request('sendChatAction', {
      chat_id: chatId,
      action,
    });
  }

  async sendPhoto(chatId: string, photo: string | SendPhotoBuffer, caption?: string) {
    if (typeof photo === 'string') {
      return this.request<{ message_id: string; date: number }>('sendPhoto', {
        chat_id: chatId,
        photo,
        caption,
      });
    }

    const form = new FormData();
    form.set('chat_id', chatId);
    if (caption) {
      form.set('caption', caption);
    }

    const binary = new Uint8Array(photo.buffer);
    const blob = new Blob([binary], {
      type: photo.mimeType || 'image/jpeg',
    });
    form.set('photo', blob, photo.filename || 'receipt.jpg');

    return this.request<{ message_id: string; date: number }>('sendPhoto', form);
  }

  async sendPhotoFromFile(chatId: string, filePath: string, caption?: string) {
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

    return this.sendPhoto(chatId, {
      buffer,
      filename: path.basename(filePath),
      mimeType,
    }, caption);
  }

  private async request<T>(method: string, payload?: RequestPayload): Promise<T> {
    const url = `${this.baseUrl}/${method}`;
    const init: RequestInit = { method: 'POST' };

    if (payload instanceof FormData) {
      init.body = payload;
    } else if (payload && Object.keys(payload).length > 0) {
      init.headers = { 'Content-Type': 'application/json' };
      init.body = JSON.stringify(payload);
    }

    const response = await fetch(url, init);
    const data = await response.json() as ZaloApiResponse<T>;

    if (!response.ok || !data.ok) {
      throw new Error(data.description || `Zalo API ${method} failed (${response.status})`);
    }

    return data.result as T;
  }
}

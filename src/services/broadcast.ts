/**
 * ==========================================
 * 📢 Broadcast Service
 * ==========================================
 * Sends messages and images to linked Zalo users.
 */

import { GoogleGenAI } from '@google/genai';
import config from '../config/index.js';
import { getAllUsers } from '../database/repositories/user.repo.js';
import { getOrCreatePersona } from '../database/repositories/persona.repo.js';
import { getZaloClient } from '../zalo/registry.js';
import logger from '../utils/logger.js';
import type { PersonaPreset } from '../types/index.js';

const ai = new GoogleGenAI({
  apiKey: config.ai.apiKey,
  httpOptions: { baseUrl: config.ai.baseURL, timeout: 30_000 },
});

const PERSONA_TONE: Record<PersonaPreset, string> = {
  'bạn thân': 'giọng bạn thân lâu năm, xưng tao/mày hoặc tui/bồ, vui vẻ gần gũi, hay trêu chọc',
  'trợ lý': 'giọng trợ lý chuyên nghiệp, xưng tôi/bạn, súc tích đi thẳng vào vấn đề',
  'nội trợ': 'giọng nội trợ đảm đang, xưng chị/em, quan tâm chi tiết, ấm áp',
  'huấn luyện viên': 'giọng huấn luyện viên tài chính, xưng tôi, thẳng thắn nghiêm khắc nhưng khích lệ',
  'hề': 'giọng hài hước châm biếm, xưng tui, dí dỏm nhiều ví von bá đạo, dùng emoji và =))',
};

export interface BroadcastResult {
  total: number;
  success: number;
  failed: number;
  errors: Array<{ userId: number; targetId: string; error: string }>;
}

function replaceVariables(
  template: string,
  user: { firstName: string; lastName: string | null; username: string | null },
): string {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return template
    .replace(/\{name\}/gi, fullName)
    .replace(/\{first_name\}/gi, user.firstName || '')
    .replace(/\{last_name\}/gi, user.lastName || '')
    .replace(/\{username\}/gi, user.username || '');
}

async function getTargetUsers(targetUserIds?: number[]) {
  const allUsers = await getAllUsers();
  const filtered = targetUserIds && targetUserIds.length > 0
    ? allUsers.filter((user) => targetUserIds.includes(user.id))
    : allUsers;

  return filtered.filter((user) => user.zaloChatId);
}

function getClient() {
  const client = getZaloClient();
  if (!client) {
    throw new Error('No Zalo client instance available');
  }
  return client;
}

export async function broadcastText(
  message: string,
  targetUserIds?: number[],
  _parseMode?: 'Markdown' | 'HTML' | undefined,
): Promise<BroadcastResult> {
  const client = getClient();
  const users = await getTargetUsers(targetUserIds);
  const result: BroadcastResult = { total: users.length, success: 0, failed: 0, errors: [] };

  for (const user of users) {
    try {
      const personalized = replaceVariables(message, user);
      await client.sendMessage(user.zaloChatId!, personalized);
      result.success++;
      await sleep(80);
    } catch (error) {
      result.failed++;
      result.errors.push({
        userId: user.id,
        targetId: user.zaloChatId || '',
        error: (error as Error).message,
      });
    }
  }

  logger.info(`📢 Broadcast text: ${result.success}/${result.total} sent`);
  return result;
}

export async function broadcastAIPersonalized(
  rawMessage: string,
  targetUserIds?: number[],
): Promise<BroadcastResult> {
  const client = getClient();
  const users = await getTargetUsers(targetUserIds);
  const result: BroadcastResult = { total: users.length, success: 0, failed: 0, errors: [] };

  for (const user of users) {
    try {
      const persona = await getOrCreatePersona(user.id);
      const preset = (persona.preset || 'bạn thân') as PersonaPreset;
      const tone = PERSONA_TONE[preset] || PERSONA_TONE['bạn thân'];
      const userName = user.firstName || 'bạn';
      const rewritten = await rewriteWithAI(rawMessage, tone, userName);

      await client.sendMessage(user.zaloChatId!, rewritten);
      result.success++;
      await sleep(150);
    } catch (error) {
      result.failed++;
      result.errors.push({
        userId: user.id,
        targetId: user.zaloChatId || '',
        error: (error as Error).message,
      });
    }
  }

  logger.info(`📢 AI Broadcast: ${result.success}/${result.total} sent`);
  return result;
}

async function rewriteWithAI(
  message: string,
  tone: string,
  userName: string,
): Promise<string> {
  const prompt = `Bạn là Penny — trợ lý chi tiêu. Viết lại tin nhắn bên dưới bằng ${tone}.
Tên người nhận: ${userName}

QUY TẮC:
- Giữ nguyên TOÀN BỘ ý chính và thông tin, KHÔNG bỏ sót nội dung nào
- KHÔNG thêm thông tin mới
- Chỉ trả lời nội dung tin nhắn đã viết lại, KHÔNG giải thích hay ghi chú
- Viết tự nhiên, đầy đủ, KHÔNG cắt ngắn

Tin nhắn gốc:
${message}`;

  try {
    const response = await ai.models.generateContent({
      model: config.ai.model,
      contents: prompt,
      config: {
        maxOutputTokens: 2048,
        temperature: 0.7,
      },
    });

    return response.text || message;
  } catch (error) {
    logger.warn(`⚠️ AI rewrite failed: ${(error as Error).message}`);
    return message;
  }
}

export async function broadcastImage(
  imageSource: string | Buffer,
  caption?: string,
  targetUserIds?: number[],
  _parseMode?: 'Markdown' | 'HTML' | undefined,
  filename?: string,
): Promise<BroadcastResult> {
  const client = getClient();
  const users = await getTargetUsers(targetUserIds);
  const result: BroadcastResult = { total: users.length, success: 0, failed: 0, errors: [] };

  for (const user of users) {
    try {
      const personalizedCaption = caption ? replaceVariables(caption, user) : undefined;

      if (Buffer.isBuffer(imageSource)) {
        await client.sendPhoto(user.zaloChatId!, {
          buffer: imageSource,
          filename: filename || 'broadcast.jpg',
          mimeType: 'image/jpeg',
        }, personalizedCaption);
      } else {
        await client.sendPhoto(user.zaloChatId!, imageSource, personalizedCaption);
      }

      result.success++;
      await sleep(80);
    } catch (error) {
      result.failed++;
      result.errors.push({
        userId: user.id,
        targetId: user.zaloChatId || '',
        error: (error as Error).message,
      });
    }
  }

  logger.info(`📢 Broadcast image: ${result.success}/${result.total} sent`);
  return result;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * ==========================================
 * 🧠 AI Service - Google Gemini via Proxy
 * ==========================================
 * Supports streaming + Google Search grounding
 * with persona-aware system prompts.
 */

import { GoogleGenAI } from '@google/genai';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { buildSystemPrompt } from './persona.js';
import { getConversationContext } from './memory.js';

// Initialize Google GenAI client with proxy base URL
const ai = new GoogleGenAI({
  apiKey: config.ai.apiKey,
  httpOptions: {
    baseUrl: config.ai.baseURL,
    timeout: 30_000,
  },
});

/**
 * Streaming chat with persona-aware prompt + Google Search fallback.
 * @param userId - DB user ID for loading persona settings
 * @param userMessage - The user's message
 */
export async function* chatStream(
  userMessage: string,
  userId?: number,
  conversationKey?: string,
): AsyncGenerator<string, void, unknown> {
  const startTime = Date.now();

  // Build persona-aware system prompt + conversation memory
  let systemPrompt = userId
    ? await buildSystemPrompt(userId)
    : buildFallbackPrompt();

  if (conversationKey) {
    systemPrompt += getConversationContext(conversationKey);
  }

  // Try with Google Search first
  try {
    yield* doStream(userMessage, systemPrompt, true);
    const elapsed = Date.now() - startTime;
    logger.info(`✅ AI stream completed in ${elapsed}ms (with Search)`);
    return;
  } catch (error) {
    const elapsed = Date.now() - startTime;
    logger.warn(`⚠️ Search stream failed in ${elapsed}ms: ${(error as Error).message?.substring(0, 80)}`);
  }

  // Fallback: retry WITHOUT Google Search
  try {
    logger.info(`🔄 Retrying without Google Search...`);
    yield* doStream(userMessage, systemPrompt, false);
    const elapsed = Date.now() - startTime;
    logger.info(`✅ AI stream completed in ${elapsed}ms (without Search)`);
  } catch (error) {
    const errorMsg = handleAIError(error);
    yield errorMsg;
  }
}

/**
 * Internal streaming implementation
 */
async function* doStream(
  userMessage: string,
  systemPrompt: string,
  useSearch: boolean,
): AsyncGenerator<string, void, unknown> {
  const response = await ai.models.generateContentStream({
    model: config.ai.model,
    contents: userMessage,
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: config.ai.maxTokens,
      temperature: config.ai.temperature,
      ...(useSearch ? { tools: [{ googleSearch: {} }] } : {}),
    },
  });

  for await (const chunk of response) {
    const text = chunk.text;
    if (text) {
      yield text;
    }
  }
}

/**
 * Non-streaming chat with persona
 */
export async function chat(userMessage: string, userId?: number): Promise<string> {
  const startTime = Date.now();
  const systemPrompt = userId ? await buildSystemPrompt(userId) : buildFallbackPrompt();

  try {
    const response = await ai.models.generateContent({
      model: config.ai.model,
      contents: userMessage,
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: config.ai.maxTokens,
        temperature: config.ai.temperature,
        tools: [{ googleSearch: {} }],
      },
    });

    const elapsed = Date.now() - startTime;
    logger.info(`✅ AI response in ${elapsed}ms`);
    return response.text || 'Xin lỗi, tôi không thể trả lời lúc này.';
  } catch {
    logger.warn('⚠️ Search request failed, retrying without Search...');
  }

  try {
    const response = await ai.models.generateContent({
      model: config.ai.model,
      contents: userMessage,
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: config.ai.maxTokens,
        temperature: config.ai.temperature,
      },
    });

    const elapsed = Date.now() - startTime;
    logger.info(`✅ AI response in ${elapsed}ms (without Search)`);
    return response.text || 'Xin lỗi, tôi không thể trả lời lúc này.';
  } catch (error) {
    return handleAIError(error);
  }
}

/**
 * Fallback prompt when no user ID is available
 */
function buildFallbackPrompt(): string {
  return `Bạn là ${config.bot.name}, một trợ lý AI thông minh và thân thiện trên Zalo.
Trả lời ngắn gọn, rõ ràng, dễ hiểu bằng tiếng Việt tự nhiên.`;
}

/**
 * Handle AI errors gracefully
 */
function handleAIError(error: unknown): string {
  const err = error as { message?: string; status?: number };
  logger.error(`❌ AI Error: ${err.message || 'Unknown error'}`);

  if (err.status === 429) return '⚠️ Hệ thống đang quá tải, thử lại sau nhé!';
  if (err.status === 401 || err.status === 403) return '🔑 Lỗi xác thực API.';
  if (err.message?.includes('timed out') || err.message?.includes('timeout')) {
    return '⏳ Phản hồi quá lâu, vui lòng thử lại!';
  }
  return '😵 Có lỗi xảy ra, vui lòng thử lại!';
}

/**
 * ==========================================
 * 🤖 Penny Zalo Runtime
 * ==========================================
 */

import fs from 'fs';
import type { Express, Request, Response } from 'express';
import { PRESET_DEFAULTS } from '../services/persona.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { ZaloBotClient } from './client.js';
import { registerZaloClient } from './registry.js';
import type { ZaloEventPayload, ZaloMessage } from './types.js';
import { extractWebhookEvent } from './webhook.js';
import {
  clearPendingState,
  getPendingState,
  setPendingState,
  type DuplicateExpensePayload,
} from './state.js';
import { addAssistantMessage, addUserMessage, getConversationContext } from '../services/memory.js';
import { detectIntent } from '../services/parser.js';
import { chatStream } from '../services/ai.js';
import { forceSaveExpense, saveExpenses } from '../services/expense.js';
import { formatCurrency, parseCurrency } from '../utils/currency.js';
import { splitLongText, stripMarkdown } from '../utils/text.js';
import { getReportData, formatReport } from '../services/report.js';
import { getHistory, getRecent } from '../services/history.js';
import { processReceiptImage } from '../services/ocr.js';
import { processPDF } from '../services/pdf.js';
import { getMediaAbsolutePath } from '../utils/media.js';
import { getTransactionsWithMedia } from '../database/repositories/transaction.repo.js';
import { getActiveBudgets, setBudget } from '../database/repositories/budget.repo.js';
import { createSession } from '../database/repositories/session.repo.js';
import {
  deleteEmptyUser,
  findOrCreateZaloUser,
  getAllUsers,
  getUserById,
  getUserByZaloUserId,
  linkZaloIdentityToUser,
} from '../database/repositories/user.repo.js';
import { getOrCreatePersona, updatePersona } from '../database/repositories/persona.repo.js';
import { getConsumableLinkCode, markLinkCodeUsed } from '../database/repositories/link.repo.js';
import { broadcastAIPersonalized, broadcastImage, broadcastText } from '../services/broadcast.js';
import type { BudgetPeriod, Category, DetectedIntent, PersonaPreset } from '../types/index.js';
import { CATEGORY_EMOJI } from '../types/index.js';
import { extractPdfUrlFromMessage, isLikelyPdfSource } from './pdfMessage.js';
import { extractImageUrlFromMessage } from './imageMessage.js';

type DbUser = NonNullable<Awaited<ReturnType<typeof findOrCreateZaloUser>>>;

const PENDING_TTL_MS = 15 * 60 * 1000;
const processedEvents = new Map<string, number>();

const PRESET_LABELS: Record<PersonaPreset, string> = {
  'bạn thân': '👫 Bạn thân',
  'trợ lý': '💼 Trợ lý',
  'nội trợ': '🏠 Nội trợ',
  'huấn luyện viên': '💪 Huấn luyện viên',
  'hề': '🤡 Hề',
};

const PRESET_CHOICES: Record<string, PersonaPreset> = {
  '1': 'bạn thân',
  '2': 'trợ lý',
  '3': 'nội trợ',
  '4': 'huấn luyện viên',
  '5': 'hề',
  'bạn thân': 'bạn thân',
  'ban than': 'bạn thân',
  'trợ lý': 'trợ lý',
  'tro ly': 'trợ lý',
  'nội trợ': 'nội trợ',
  'noi tro': 'nội trợ',
  'huấn luyện viên': 'huấn luyện viên',
  'huan luyen vien': 'huấn luyện viên',
  'hlv': 'huấn luyện viên',
  'hề': 'hề',
  'he': 'hề',
};

const GENDER_CHOICES: Record<string, string> = {
  '1': 'nam',
  '2': 'nữ',
  '3': 'khác',
  'nam': 'nam',
  'nu': 'nữ',
  'nữ': 'nữ',
  'khac': 'khác',
  'khác': 'khác',
};

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function getConversationKey(userId: number): string {
  return `user:${userId}`;
}

function formatSlider(level: number): string {
  const filled = '█'.repeat(level);
  const empty = '░'.repeat(10 - level);
  return `${filled}${empty} ${level}/10`;
}

function normalizePeriod(input: string): BudgetPeriod | null {
  const normalized = normalizeText(input);
  if (['week', 'weekly', 'tuần', 'tuan', '1'].includes(normalized)) return 'week';
  if (['month', 'monthly', 'tháng', 'thang', '2'].includes(normalized)) return 'month';
  return null;
}

function normalizePreset(input: string): PersonaPreset | null {
  return PRESET_CHOICES[normalizeText(input)] || null;
}

function normalizeGender(input: string): string | null {
  if (['skip', 'bỏ qua', 'bo qua'].includes(normalizeText(input))) return 'skip';
  return GENDER_CHOICES[normalizeText(input)] || null;
}

function isYes(input: string): boolean {
  return ['y', 'yes', 'co', 'có', 'ok', '1', 'thêm', 'them'].includes(normalizeText(input));
}

function isNo(input: string): boolean {
  return ['n', 'no', 'khong', 'không', '0', 'bo qua', 'bỏ qua', 'skip'].includes(normalizeText(input));
}

function buildHelpText(): string {
  return [
    '📋 Penny Zalo Commands',
    '',
    '/start - Cài đặt ban đầu',
    '/limit - Đặt ngân sách tuần/tháng',
    '/report - Báo cáo chi tiêu',
    '/recent - 10 khoản gần nhất',
    '/tone - Xem/chỉnh tone của Penny',
    '/login - Lấy link Dashboard',
    '/link <mã> - Liên kết dữ liệu từ Telegram cũ',
    '/help - Xem hướng dẫn',
    '',
    '💬 Bạn vẫn có thể nhắn tự nhiên để ghi chi tiêu, gửi ảnh/PDF hóa đơn, xem lịch sử hoặc trò chuyện.',
  ].join('\n');
}

function formatBudgetsSummary(items: Array<{ period: string; amount: number }>): string {
  if (items.length === 0) {
    return '📊 Bạn chưa đặt ngân sách nào.';
  }

  return items
    .map((budget) => `• ${budget.period === 'week' ? 'Tuần' : 'Tháng'}: ${formatCurrency(budget.amount)}`)
    .join('\n');
}

function buildPublicMediaUrl(relativePath: string): string | null {
  if (!config.dashboard.url || !config.dashboard.url.startsWith('https://')) {
    return null;
  }

  return `${config.dashboard.url}/api/media/${relativePath}`;
}

export class PennyZaloRuntime {
  private polling = false;

  constructor(private readonly client: ZaloBotClient) {
    registerZaloClient(client);
  }

  async bootstrap(app: Express): Promise<void> {
    const me = await this.client.getMe();
    logger.info(`📋 Zalo Bot: ${me.display_name || me.account_name}`);
    logger.info(`🆔 Zalo Bot ID: ${me.id}`);

    if (config.zalo.webhookDomain) {
      if (!config.zalo.webhookSecretToken) {
        throw new Error('WEBHOOK_SECRET_TOKEN is required when WEBHOOK_DOMAIN is configured');
      }

      this.attachWebhook(app);

      const baseUrl = config.zalo.webhookDomain.startsWith('http')
        ? config.zalo.webhookDomain.replace(/\/$/, '')
        : `https://${config.zalo.webhookDomain.replace(/\/$/, '')}`;
      const webhookUrl = `${baseUrl}${config.zalo.webhookPath}`;

      await this.client.setWebhook(webhookUrl, config.zalo.webhookSecretToken);
      logger.info(`🔗 Zalo webhook set: ${webhookUrl}`);
      return;
    }

    logger.warn('⚠️ WEBHOOK_DOMAIN chưa được cấu hình, Penny sẽ chạy ở chế độ polling tốt nhất có thể.');
    this.polling = true;
    void this.pollLoop();
  }

  attachWebhook(app: Express): void {
    app.post(config.zalo.webhookPath, async (req: Request, res: Response) => {
      const secret = String(req.headers['x-bot-api-secret-token'] || '');
      if (secret !== config.zalo.webhookSecretToken) {
        res.status(403).json({ message: 'Unauthorized' });
        return;
      }

      try {
        const event = extractWebhookEvent(req.body);
        if (event) {
          await this.handleEvent(event);
        }
        res.json({ message: 'Success' });
      } catch (error) {
        logger.error(`Webhook handler error: ${(error as Error).message}`);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });
  }

  private async pollLoop(): Promise<void> {
    while (this.polling) {
      try {
        const updates = await this.client.getUpdates(config.zalo.pollingTimeoutSeconds);
        for (const event of updates) {
          await this.handleEvent(event);
        }
      } catch (error) {
        const message = (error as Error).message || '';
        if (message.toLowerCase().includes('timeout')) {
          continue;
        }
        logger.error(`Polling error: ${message}`);
        await new Promise((resolve) => setTimeout(resolve, 3_000));
      }
    }
  }

  private async handleEvent(event: ZaloEventPayload): Promise<void> {
    const message = event.message;
    if (!message || message.from.is_bot) {
      return;
    }

    const dedupeKey = `${event.event_name}:${message.message_id}`;
    if (processedEvents.has(dedupeKey)) {
      return;
    }

    processedEvents.set(dedupeKey, Date.now());
    this.cleanupProcessedEvents();

    if (
      event.event_name === 'message.image.received' ||
      event.event_name === 'message.document.received' ||
      event.event_name === 'message.file.received' ||
      event.event_name === 'message.pdf.received'
    ) {
      logger.info(
        `📥 Zalo media event ${event.event_name} keys=${Object.keys(message).join(',')} photo=${Boolean(message.photo)} document=${Boolean(message.document)} url=${Boolean(message.url)} mime=${message.mime_type || '-'} file=${message.file_name || '-'}`,
      );
    }

    switch (event.event_name) {
      case 'message.text.received':
        await this.handleTextMessage(message);
        break;
      case 'message.image.received':
        await this.handleImageMessage(message);
        break;
      case 'message.document.received':
      case 'message.file.received':
      case 'message.pdf.received':
        await this.handlePdfMessage(message);
        break;
      case 'message.unsupported.received':
      case 'message.sticker.received':
      default:
        await this.reply(
          message.chat.id,
          '📎 Zalo Bot hiện hỗ trợ tốt nhất với tin nhắn text, ảnh và PDF. Nếu file chưa đọc được, hãy gửi lại hoặc dùng /login để mở Dashboard.',
        );
    }
  }

  private cleanupProcessedEvents(): void {
    const now = Date.now();
    for (const [key, timestamp] of processedEvents) {
      if (now - timestamp > 60 * 60 * 1000) {
        processedEvents.delete(key);
      }
    }
  }

  private async handleTextMessage(message: ZaloMessage): Promise<void> {
    const text = message.text?.trim();
    if (!text) {
      return;
    }

    const existingUser = await getUserByZaloUserId(message.from.id);

    if (text.toLowerCase().startsWith('/link')) {
      await this.handleLinkCommand(message, text, existingUser);
      return;
    }

    const user = existingUser || await this.requireUser(message);

    if (text.startsWith('/')) {
      const handled = await this.handleCommand(user, message, text);
      if (handled) {
        return;
      }
    }

    const pendingHandled = await this.handlePendingState(user, message, text);
    if (pendingHandled) {
      return;
    }

    if (text.startsWith('/')) {
      await this.reply(message.chat.id, '❓ Lệnh chưa được hỗ trợ. Gõ /help để xem danh sách lệnh.');
      return;
    }

    const pdfUrl = extractPdfUrlFromMessage(message);
    if (pdfUrl) {
      await this.handlePdfMessage(message, user, pdfUrl);
      return;
    }

    await this.handleIntentText(user, message, text);
  }

  private async handleImageMessage(message: ZaloMessage): Promise<void> {
    const user = await this.requireUser(message);
    const pending = getPendingState(user.id);

    if (pending?.type === 'admin_broadcast_image') {
      clearPendingState(user.id);

      if (!this.isAdmin(user, message)) {
        await this.reply(message.chat.id, '⛔ Bạn không có quyền broadcast.');
        return;
      }

      const imageUrl = extractImageUrlFromMessage(message);
      if (!imageUrl) {
        await this.reply(message.chat.id, '❌ Ảnh không hợp lệ.');
        return;
      }

      const response = await fetch(imageUrl);
      const buffer = Buffer.from(await response.arrayBuffer());
      const caption = message.caption || undefined;
      const result = await broadcastImage(buffer, caption);
      await this.reply(
        message.chat.id,
        `✅ Broadcast hình hoàn tất\n📨 ${result.success}/${result.total} thành công\n❌ ${result.failed} thất bại`,
      );
      return;
    }

    const imageUrl = extractImageUrlFromMessage(message);
    if (!imageUrl) {
      logger.warn(
        `⚠️ Image event missing image URL. keys=${Object.keys(message).join(',')} mime=${message.mime_type || '-'} file=${message.file_name || '-'}`,
      );
      await this.reply(message.chat.id, '😅 Mình chưa đọc được ảnh này.');
      return;
    }

    await this.client.sendChatAction(message.chat.id, 'typing').catch(() => {});

    try {
      const response = await fetch(imageUrl);
      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get('content-type') || 'image/jpeg';

      const mediaPath = await this.saveIncomingImage(buffer, user.id, contentType);
      const result = await processReceiptImage(buffer, contentType, user.id, mediaPath);

      await this.reply(message.chat.id, stripMarkdown(result.message));
    } catch (error) {
      logger.error(`Photo handler error: ${(error as Error).message}`);
      await this.reply(message.chat.id, '😅 Có lỗi khi xử lý ảnh. Bạn thử gửi lại hoặc nhập bằng text nhé!');
    }
  }

  private async handlePdfMessage(
    message: ZaloMessage,
    existingUser?: DbUser,
    sourceUrl?: string,
  ): Promise<void> {
    const user = existingUser || await this.requireUser(message);
    const pdfUrl = sourceUrl || extractPdfUrlFromMessage(message);

    if (!pdfUrl) {
      await this.reply(
        message.chat.id,
        '📄 Mình chưa lấy được file PDF từ tin nhắn này. Bạn thử gửi lại file, gửi link PDF trực tiếp hoặc dùng /login nhé.',
      );
      return;
    }

    await this.client.sendChatAction(message.chat.id, 'typing').catch(() => {});

    try {
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      const fileName = message.file_name || this.getFilenameFromUrl(pdfUrl);

      if (!isLikelyPdfSource({
        contentType,
        fileName,
        sourceUrl: pdfUrl,
        mimeType: message.mime_type,
      })) {
        await this.reply(
          message.chat.id,
          '📄 Link/file này chưa có dấu hiệu là PDF hợp lệ. Bạn thử gửi lại PDF hoặc dùng /login nhé.',
        );
        return;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const mediaPath = await this.saveIncomingPdf(buffer, user.id);
      const result = await processPDF(buffer, user.id, mediaPath);
      await this.reply(message.chat.id, stripMarkdown(result.message));
    } catch (error) {
      logger.error(`PDF handler error: ${(error as Error).message}`);
      await this.reply(message.chat.id, '😅 Có lỗi khi tải hoặc đọc file PDF. Bạn thử gửi lại hoặc dùng /login nhé!');
    }
  }

  private async handleCommand(user: DbUser, message: ZaloMessage, text: string): Promise<boolean> {
    const [command] = text.split(/\s+/, 1);
    const args = text.slice(command.length).trim();

    switch (command.toLowerCase()) {
      case '/start':
        await this.handleStart(user, message);
        return true;
      case '/help':
        await this.reply(message.chat.id, buildHelpText());
        return true;
      case '/report':
        await this.handleReportCommand(user, message);
        return true;
      case '/recent':
        await this.reply(message.chat.id, stripMarkdown(await getRecent(user.id, 10)));
        return true;
      case '/limit':
        await this.handleLimitCommand(user, message, args);
        return true;
      case '/tone':
        await this.handleToneCommand(user, message, args);
        return true;
      case '/login':
        await this.handleLoginCommand(user, message);
        return true;
      case '/id':
        await this.reply(
          message.chat.id,
          [
            '👤 Thông tin hiện tại',
            `• Internal ID: ${user.id}`,
            `• Zalo User ID: ${message.from.id}`,
            `• Chat ID: ${message.chat.id}`,
            `• Tên: ${message.from.display_name}`,
          ].join('\n'),
        );
        return true;
      case '/admin':
        await this.handleAdminSummary(user, message);
        return true;
      case '/broadcast':
        await this.handleBroadcastCommand(user, message, args);
        return true;
      case '/broadcastimg':
        await this.handleBroadcastImageCommand(user, message);
        return true;
      case '/broadcastai':
        await this.handleBroadcastAICommand(user, message, args);
        return true;
      case '/cancel':
        clearPendingState(user.id);
        await this.reply(message.chat.id, '❌ Đã huỷ tác vụ đang chờ.');
        return true;
      default:
        return false;
    }
  }

  private async handlePendingState(user: DbUser, message: ZaloMessage, text: string): Promise<boolean> {
    const state = getPendingState(user.id);
    if (!state) {
      return false;
    }

    switch (state.type) {
      case 'onboarding_preset': {
        const preset = normalizePreset(text);
        if (!preset) {
          await this.reply(message.chat.id, '❌ Mình chưa hiểu lựa chọn. Hãy trả lời 1-5 hoặc tên preset.');
          return true;
        }

        const defaults = PRESET_DEFAULTS[preset];
        await updatePersona(user.id, {
          preset,
          sarcasmLevel: defaults.sarcasm,
          seriousnessLevel: defaults.seriousness,
          frugalityLevel: defaults.frugality,
          emojiLevel: defaults.emoji,
        });

        setPendingState(user.id, { type: 'onboarding_name', preset }, PENDING_TTL_MS);
        await this.reply(
          message.chat.id,
          `✅ Đã chọn ${PRESET_LABELS[preset]}\n\nBạn muốn Penny gọi bạn là gì? Trả lời tên/nickname hoặc gõ "skip" để dùng tên Zalo.`,
        );
        return true;
      }

      case 'onboarding_name': {
        const displayName = ['skip', 'bỏ qua', 'bo qua'].includes(normalizeText(text))
          ? message.from.display_name
          : text.trim();

        await updatePersona(user.id, { displayName });
        setPendingState(user.id, { type: 'onboarding_gender' }, PENDING_TTL_MS);

        await this.reply(
          message.chat.id,
          `👌 Mình sẽ gọi bạn là ${displayName}\n\nChọn giới tính để xưng hô tự nhiên hơn:\n1. Nam\n2. Nữ\n3. Khác\nHoặc gõ "skip" để bỏ qua.`,
        );
        return true;
      }

      case 'onboarding_gender': {
        const gender = normalizeGender(text);
        if (!gender) {
          await this.reply(message.chat.id, '❌ Hãy trả lời 1, 2, 3 hoặc "skip".');
          return true;
        }

        clearPendingState(user.id);
        if (gender !== 'skip') {
          await updatePersona(user.id, { gender });
        }

        const persona = await getOrCreatePersona(user.id);
        const displayName = persona.displayName || user.firstName || message.from.display_name;
        await this.reply(
          message.chat.id,
          [
            '🎉 Cài đặt hoàn tất!',
            `• Vai trò: ${persona.preset}`,
            `• Tên gọi: ${displayName}`,
            `• Giới tính: ${gender === 'skip' ? 'Chưa đặt' : gender}`,
            `• Cà khịa: ${formatSlider(persona.sarcasmLevel)}`,
            `• Nghiêm túc: ${formatSlider(persona.seriousnessLevel)}`,
            `• Tiết kiệm: ${formatSlider(persona.frugalityLevel)}`,
            `• Emoji: ${formatSlider(persona.emojiLevel)}`,
            '',
            '💬 Giờ bạn có thể nhắn kiểu: "ăn trưa 50k" hoặc "rau 30k, cá 50k".',
          ].join('\n'),
        );
        return true;
      }

      case 'budget_period': {
        const period = normalizePeriod(text);
        if (!period) {
          await this.reply(message.chat.id, '❌ Hãy trả lời "tuần" hoặc "tháng".');
          return true;
        }

        setPendingState(user.id, { type: 'budget_amount', period }, PENDING_TTL_MS);
        await this.reply(
          message.chat.id,
          `💰 Nhập ngân sách ${period === 'week' ? 'tuần' : 'tháng'}.\nVí dụ: 500k, 1.5 triệu, 5000000`,
        );
        return true;
      }

      case 'budget_amount': {
        const amount = parseCurrency(text);
        if (!amount || amount <= 0) {
          await this.reply(message.chat.id, '❌ Số tiền chưa hợp lệ. Hãy nhập lại, ví dụ 500k hoặc 1.5 triệu.');
          return true;
        }

        clearPendingState(user.id);
        await setBudget(user.id, state.period, amount);
        await this.reply(
          message.chat.id,
          `✅ Đã đặt ngân sách ${state.period === 'week' ? 'tuần' : 'tháng'}: ${formatCurrency(amount)}`,
        );
        return true;
      }

      case 'duplicate_confirm': {
        if (isYes(text)) {
          clearPendingState(user.id);
          const tx = await forceSaveExpense(
            user.id,
            state.expense.amount,
            state.expense.description,
            state.expense.category,
            state.expense.rawInput,
            state.expense.date,
          );
          const emoji = CATEGORY_EMOJI[tx.category as Category] || '📦';
          await this.reply(message.chat.id, `✅ Đã lưu: ${emoji} ${tx.description}: ${formatCurrency(tx.amount)}`);
          return true;
        }

        if (isNo(text)) {
          clearPendingState(user.id);
          await this.reply(message.chat.id, '❌ Đã bỏ qua khoản này.');
          return true;
        }

        await this.reply(message.chat.id, '⚠️ Hãy trả lời "có" để lưu hoặc "không" để bỏ qua khoản bị nghi trùng.');
        return true;
      }

      case 'admin_broadcast_text': {
        clearPendingState(user.id);
        const result = await broadcastText(text);
        await this.reply(
          message.chat.id,
          `✅ Broadcast hoàn tất\n📨 ${result.success}/${result.total} thành công\n❌ ${result.failed} thất bại`,
        );
        return true;
      }

      case 'admin_broadcast_image':
        return false;

      default:
        return false;
    }
  }

  private async handleIntentText(user: DbUser, message: ZaloMessage, text: string): Promise<void> {
    const conversationKey = getConversationKey(user.id);
    addUserMessage(conversationKey, text);

    try {
      const intent = await detectIntent(text, getConversationContext(conversationKey) || undefined);

      switch (intent.intent) {
        case 'expense':
          await this.handleExpenseIntent(user, message, intent, text);
          break;
        case 'set_budget':
          if (intent.budget) {
            await setBudget(user.id, intent.budget.period, intent.budget.amount);
            await this.reply(message.chat.id, `✅ Đã đặt ngân sách ${intent.budget.period === 'week' ? 'tuần' : 'tháng'}: ${formatCurrency(intent.budget.amount)}`);
          }
          break;
        case 'view_report':
          await this.handleReportCommand(user, message);
          break;
        case 'view_history':
          await this.reply(message.chat.id, stripMarkdown(await getHistory(user.id, intent.history_period ?? undefined)));
          break;
        case 'update_expense':
          await this.handleStreaming(user, message.chat.id, `Người dùng muốn sửa/cập nhật chi tiêu đã ghi trước đó.
Tin nhắn: "${text}"

Nếu user nói thiếu hoặc sai, hãy hỏi cụ thể cần sửa/thêm gì.
Nếu user cung cấp đủ thông tin (tên khoản + số tiền), ghi nhận là expense mới.
Trả lời ngắn gọn 1-3 câu theo persona, hỏi rõ ràng.`);
          break;
        case 'greeting':
        case 'general_chat':
        default:
          if (this.isReceiptQuery(text)) {
            await this.handleReceiptQuery(user, message.chat.id, text);
          } else {
            await this.handleStreaming(user, message.chat.id, text);
          }
      }
    } catch (error) {
      logger.error(`Text handler error: ${(error as Error).message}`);
      await this.reply(message.chat.id, '😵 Có lỗi xảy ra, vui lòng thử lại!');
    }
  }

  private async handleExpenseIntent(
    user: DbUser,
    message: ZaloMessage,
    intent: DetectedIntent,
    rawInput: string,
  ): Promise<void> {
    const parsed = intent.expense;
    if (!parsed || parsed.items.length === 0) {
      await this.handleStreaming(user, message.chat.id, rawInput);
      return;
    }

    const result = await saveExpenses(user.id, parsed, rawInput);
    if (result.hasDuplicate) {
      const item = parsed.items[0];
      const expense: DuplicateExpensePayload = {
        amount: item.amount,
        description: item.description,
        category: item.category,
        rawInput,
        date: parsed.date ?? undefined,
      };

      setPendingState(user.id, { type: 'duplicate_confirm', expense }, 2 * 60 * 1000);
      await this.reply(
        message.chat.id,
        `⚠️ Gần đây bạn đã có khoản ${formatCurrency(item.amount)} rồi. Trả lời "có" để lưu thêm hoặc "không" để bỏ qua.`,
      );
      return;
    }

    if (result.saved.length === 1) {
      const prompt = `Người dùng vừa ghi chi tiêu: "${rawInput}"
Đã lưu: ${result.summary}

Hãy xác nhận ngắn gọn (1-2 câu) theo đúng giọng điệu/persona hiện tại. KHÔNG giải thích dài dòng hoặc hỏi lại.`;
      await this.handleStreaming(user, message.chat.id, prompt, {
        fallbackText: `✅ Đã ghi: ${result.summary}`,
        persistUserMessage: false,
      });
      return;
    }

    await this.reply(message.chat.id, `✅ Đã ghi ${result.saved.length} khoản:\n${result.summary}`);
  }

  private async handleReportCommand(user: DbUser, message: ZaloMessage): Promise<void> {
    const data = await getReportData(user.id);
    const report = stripMarkdown(formatReport(data));
    let comment = '';

    try {
      const prompt = `Dữ liệu chi tiêu tuần: ${data.weekTotal}, tháng: ${data.monthTotal}. Ngân sách tháng: ${data.monthBudget || 'chưa đặt'}. Hãy nhận xét ngắn 1-2 câu theo đúng persona hiện tại. Chỉ nhận xét, không liệt kê số liệu.`;
      for await (const chunk of chatStream(prompt, user.id, getConversationKey(user.id))) {
        comment += chunk;
      }
    } catch {
      // Ignore persona comment failures
    }

    const fullText = comment ? `${report}\n\n💬 Penny: ${comment}` : report;
    await this.reply(message.chat.id, fullText);
  }

  private async handleLimitCommand(user: DbUser, message: ZaloMessage, args: string): Promise<void> {
    if (!args) {
      const budgets = await getActiveBudgets(user.id);
      setPendingState(user.id, { type: 'budget_period' }, PENDING_TTL_MS);
      await this.reply(
        message.chat.id,
        `${formatBudgetsSummary(budgets)}\n\n💰 Bạn muốn đặt ngân sách cho "tuần" hay "tháng"?`,
      );
      return;
    }

    const [rawPeriod, ...rest] = args.split(/\s+/);
    const period = normalizePeriod(rawPeriod);
    const amount = parseCurrency(rest.join(' '));

    if (!period || !amount || amount <= 0) {
      await this.reply(
        message.chat.id,
        '❌ Cú pháp chưa đúng. Ví dụ:\n/limit tuần 500k\n/limit tháng 5 triệu',
      );
      return;
    }

    await setBudget(user.id, period, amount);
    await this.reply(message.chat.id, `✅ Đã đặt ngân sách ${period === 'week' ? 'tuần' : 'tháng'}: ${formatCurrency(amount)}`);
  }

  private async handleToneCommand(user: DbUser, message: ZaloMessage, args: string): Promise<void> {
    const persona = await getOrCreatePersona(user.id);

    if (!args) {
      const displayName = persona.displayName || user.firstName || message.from.display_name;
      await this.reply(
        message.chat.id,
        [
          '🎭 Cài đặt tone của Penny',
          `• Vai trò: ${persona.preset}`,
          `• Tên gọi: ${displayName}`,
          `• Cà khịa: ${formatSlider(persona.sarcasmLevel)}`,
          `• Nghiêm túc: ${formatSlider(persona.seriousnessLevel)}`,
          `• Tiết kiệm: ${formatSlider(persona.frugalityLevel)}`,
          `• Emoji: ${formatSlider(persona.emojiLevel)}`,
          '',
          'Cách chỉnh nhanh:',
          '/tone preset 1',
          '/tone name Trong',
          '/tone sarcasm 7',
          '/tone seriousness 8',
          '/tone frugality 6',
          '/tone emoji 4',
        ].join('\n'),
      );
      return;
    }

    const [field, ...rest] = args.split(/\s+/);
    const value = rest.join(' ').trim();

    if (field === 'preset') {
      const preset = normalizePreset(value);
      if (!preset) {
        await this.reply(message.chat.id, '❌ Preset không hợp lệ. Chọn 1-5 hoặc tên preset.');
        return;
      }

      const defaults = PRESET_DEFAULTS[preset];
      await updatePersona(user.id, {
        preset,
        sarcasmLevel: defaults.sarcasm,
        seriousnessLevel: defaults.seriousness,
        frugalityLevel: defaults.frugality,
        emojiLevel: defaults.emoji,
      });
      await this.reply(message.chat.id, `✅ Đã chuyển tone sang ${PRESET_LABELS[preset]}.`);
      return;
    }

    if (field === 'name') {
      if (!value) {
        await this.reply(message.chat.id, '❌ Bạn hãy nhập tên mới, ví dụ: /tone name Danh');
        return;
      }

      await updatePersona(user.id, { displayName: value });
      await this.reply(message.chat.id, `✅ Penny sẽ gọi bạn là ${value}.`);
      return;
    }

    const sliderValue = Number(value);
    if (!Number.isFinite(sliderValue) || sliderValue < 0 || sliderValue > 10) {
      await this.reply(message.chat.id, '❌ Mức tone phải là số từ 0 đến 10.');
      return;
    }

    const updates: Record<string, number> = {};
    const labels: Record<string, string> = {
      sarcasm: 'Cà khịa',
      seriousness: 'Nghiêm túc',
      frugality: 'Tiết kiệm',
      emoji: 'Emoji',
    };

    if (field === 'sarcasm') updates.sarcasmLevel = sliderValue;
    else if (field === 'seriousness') updates.seriousnessLevel = sliderValue;
    else if (field === 'frugality') updates.frugalityLevel = sliderValue;
    else if (field === 'emoji') updates.emojiLevel = sliderValue;
    else {
      await this.reply(message.chat.id, '❌ Trường tone không hợp lệ.');
      return;
    }

    await updatePersona(user.id, updates);
    await this.reply(message.chat.id, `✅ Đã cập nhật ${labels[field]} thành ${sliderValue}/10.`);
  }

  private async handleLoginCommand(user: DbUser, message: ZaloMessage): Promise<void> {
    const { token, expiresAt } = await createSession(user.id);
    const dashboardUrl = config.dashboard.url || `http://localhost:${config.dashboard.port}`;
    const link = `${dashboardUrl}?token=${token}`;
    const timeStr = new Date(expiresAt).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    await this.reply(
      message.chat.id,
      [
        '🔐 Link truy cập Dashboard',
        link,
        '',
        `⏰ Hết hạn lúc: ${timeStr}`,
        '⚠️ Link chỉ dành riêng cho bạn, không chia sẻ cho người khác.',
      ].join('\n'),
    );
  }

  private async handleAdminSummary(user: DbUser, message: ZaloMessage): Promise<void> {
    if (!this.isAdmin(user, message)) {
      await this.reply(message.chat.id, '⛔ Bạn không có quyền truy cập Admin.');
      return;
    }

    const users = await getAllUsers();
    await this.reply(
      message.chat.id,
      [
        '👑 Admin Panel',
        `📊 Tổng users: ${users.length}`,
        '',
        'Lệnh hỗ trợ:',
        '/broadcast <nội dung>',
        '/broadcastimg',
        '/broadcastai <nội dung>',
        '/cancel',
      ].join('\n'),
    );
  }

  private async handleBroadcastCommand(user: DbUser, message: ZaloMessage, args: string): Promise<void> {
    if (!this.isAdmin(user, message)) {
      await this.reply(message.chat.id, '⛔ Bạn không có quyền broadcast.');
      return;
    }

    if (!args) {
      setPendingState(user.id, { type: 'admin_broadcast_text' }, PENDING_TTL_MS);
      await this.reply(message.chat.id, '📝 Hãy gửi tin nhắn tiếp theo để broadcast tới tất cả user đã liên kết Zalo.');
      return;
    }

    const result = await broadcastText(args);
    await this.reply(
      message.chat.id,
      `✅ Broadcast hoàn tất\n📨 ${result.success}/${result.total} thành công\n❌ ${result.failed} thất bại`,
    );
  }

  private async handleBroadcastImageCommand(user: DbUser, message: ZaloMessage): Promise<void> {
    if (!this.isAdmin(user, message)) {
      await this.reply(message.chat.id, '⛔ Bạn không có quyền broadcast.');
      return;
    }

    setPendingState(user.id, { type: 'admin_broadcast_image' }, PENDING_TTL_MS);
    await this.reply(message.chat.id, '📸 Hãy gửi ảnh tiếp theo để broadcast. Caption nếu có sẽ được gửi kèm.');
  }

  private async handleBroadcastAICommand(user: DbUser, message: ZaloMessage, args: string): Promise<void> {
    if (!this.isAdmin(user, message)) {
      await this.reply(message.chat.id, '⛔ Bạn không có quyền broadcast.');
      return;
    }

    if (!args) {
      await this.reply(message.chat.id, '❌ Hãy nhập nội dung cần rewrite và broadcast, ví dụ: /broadcastai Penny có tính năng mới.');
      return;
    }

    const result = await broadcastAIPersonalized(args);
    await this.reply(
      message.chat.id,
      `✅ AI Broadcast hoàn tất\n📨 ${result.success}/${result.total} thành công\n❌ ${result.failed} thất bại`,
    );
  }

  private async handleLinkCommand(
    message: ZaloMessage,
    text: string,
    existingUser: Awaited<ReturnType<typeof getUserByZaloUserId>>,
  ): Promise<void> {
    const args = text.replace(/^\/link/i, '').trim();
    if (!args) {
      await this.reply(
        message.chat.id,
        [
          '🔗 Liên kết dữ liệu Penny cũ',
          config.bot.migrationHelpText,
          '',
          'Sau khi có mã, hãy gửi:',
          '/link ABCD1234',
        ].join('\n'),
      );
      return;
    }

    const linkRecord = await getConsumableLinkCode(args, 'zalo');
    if (!linkRecord) {
      await this.reply(message.chat.id, '❌ Mã liên kết không hợp lệ hoặc đã hết hạn.');
      return;
    }

    const targetUser = await getUserById(linkRecord.userId);
    if (!targetUser) {
      await this.reply(message.chat.id, '❌ Không tìm thấy tài khoản Penny cần liên kết.');
      return;
    }

    if (existingUser && existingUser.id !== targetUser.id) {
      const deleted = await deleteEmptyUser(existingUser.id);
      if (!deleted) {
        await this.reply(
          message.chat.id,
          '⚠️ Tài khoản Zalo này đã phát sinh dữ liệu riêng nên mình chưa thể tự gộp. Vui lòng liên hệ admin để xử lý thủ công.',
        );
        return;
      }
    }

    await linkZaloIdentityToUser(targetUser.id, {
      zaloUserId: message.from.id,
      chatId: message.chat.id,
      displayName: message.from.display_name,
    });
    await markLinkCodeUsed(linkRecord.id);

    await this.reply(
      message.chat.id,
      `✅ Liên kết thành công. Từ giờ Penny trên Zalo sẽ dùng lại toàn bộ dữ liệu cũ của bạn.`,
    );
  }

  private async handleStart(user: DbUser, message: ZaloMessage): Promise<void> {
    await getOrCreatePersona(user.id);
    setPendingState(user.id, { type: 'onboarding_preset' }, PENDING_TTL_MS);

    await this.reply(
      message.chat.id,
      [
        `👋 Chào ${message.from.display_name}!`,
        `Mình là ${config.bot.name} — trợ lý chi tiêu cá nhân của bạn trên Zalo.`,
        '',
        'Chọn phong cách nói chuyện bạn thích bằng cách trả lời 1-5:',
        '1. 👫 Bạn thân',
        '2. 💼 Trợ lý',
        '3. 🏠 Nội trợ',
        '4. 💪 Huấn luyện viên',
        '5. 🤡 Hề',
      ].join('\n'),
    );
  }

  private async handleStreaming(
    user: DbUser,
    chatId: string,
    userMessage: string,
    options?: { fallbackText?: string; persistUserMessage?: boolean },
  ): Promise<void> {
    const conversationKey = getConversationKey(user.id);
    const persistUserMessage = options?.persistUserMessage ?? false;

    if (persistUserMessage) {
      addUserMessage(conversationKey, userMessage);
    }

    let fullText = '';
    const typingInterval = setInterval(() => {
      void this.client.sendChatAction(chatId, 'typing').catch(() => {});
    }, 4_000);

    try {
      await this.client.sendChatAction(chatId, 'typing').catch(() => {});
      for await (const chunk of chatStream(userMessage, user.id, conversationKey)) {
        fullText += chunk;
      }
    } finally {
      clearInterval(typingInterval);
    }

    const replyText = fullText.trim() || options?.fallbackText || '😵 Không nhận được phản hồi.';
    addAssistantMessage(conversationKey, replyText.substring(0, 500));
    await this.reply(chatId, replyText);
  }

  private async handleReceiptQuery(user: DbUser, chatId: string, rawText: string): Promise<void> {
    const receipts = await getTransactionsWithMedia(user.id, 10);
    if (receipts.length === 0) {
      await this.handleStreaming(user, chatId, rawText);
      return;
    }

    const publicBase = config.dashboard.url;
    let sentCount = 0;

    for (const tx of receipts.slice(0, 3)) {
      if (!tx.mediaPath) continue;

      const caption = `${tx.description}\n💰 ${formatCurrency(tx.amount)}`;
      if (tx.mediaPath.endsWith('.pdf')) {
        if (publicBase) {
          const mediaUrl = buildPublicMediaUrl(tx.mediaPath);
          await this.reply(chatId, `📄 ${caption}\n${mediaUrl || 'Không tạo được link PDF.'}`);
          sentCount++;
        }
        continue;
      }

      const absPath = getMediaAbsolutePath(tx.mediaPath);
      if (!fs.existsSync(absPath)) continue;

      try {
        const publicUrl = buildPublicMediaUrl(tx.mediaPath);
        if (publicUrl) {
          await this.client.sendPhoto(chatId, publicUrl, caption);
        } else {
          await this.client.sendPhotoFromFile(chatId, absPath, caption);
        }
        sentCount++;
      } catch (error) {
        logger.error(`Failed to send receipt ${tx.id}: ${(error as Error).message}`);
      }
    }

    if (sentCount === 0) {
      await this.reply(
        chatId,
        '📎 Mình tìm thấy hóa đơn cũ nhưng chưa gửi lại trực tiếp được trên Zalo. Hãy dùng /login để mở Dashboard và xem file gốc.',
      );
      return;
    }

    await this.handleStreaming(
      user,
      chatId,
      `Người dùng hỏi về hóa đơn. Mình vừa gửi lại ${sentCount} hóa đơn gần đây nhất. Phản hồi ngắn gọn 1-2 câu theo persona, xác nhận đã gửi lại.`,
      { persistUserMessage: false },
    );
  }

  private isReceiptQuery(message: string): boolean {
    const lower = message.toLowerCase();
    return [
      'hóa đơn',
      'hoá đơn',
      'bill',
      'receipt',
      'ảnh bill',
      'ảnh hóa đơn',
      'xem lại bill',
      'xem hóa đơn',
      'gửi lại hóa đơn',
      'gửi lại bill',
      'tìm hóa đơn',
      'xem ảnh',
    ].some((keyword) => lower.includes(keyword));
  }

  private isAdmin(user: DbUser, message: ZaloMessage): boolean {
    return (
      config.adminUserIds.includes(user.id) ||
      config.adminExternalIds.includes(message.from.id) ||
      (user.telegramId ? config.adminExternalIds.includes(String(user.telegramId)) : false) ||
      (user.zaloUserId ? config.adminExternalIds.includes(user.zaloUserId) : false) ||
      (user.zaloChatId ? config.adminExternalIds.includes(user.zaloChatId) : false)
    );
  }

  private async requireUser(message: ZaloMessage): Promise<DbUser> {
    const user = await findOrCreateZaloUser({
      zaloUserId: message.from.id,
      chatId: message.chat.id,
      displayName: message.from.display_name,
    });

    if (!user) {
      throw new Error('Unable to resolve Zalo user');
    }

    return user;
  }

  private async saveIncomingImage(buffer: Buffer, userId: number, mimeType: string): Promise<string> {
    const { saveMedia } = await import('../utils/media.js');
    const extension = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
    return saveMedia(buffer, userId, 'image', extension);
  }

  private async saveIncomingPdf(buffer: Buffer, userId: number): Promise<string> {
    const { saveMedia } = await import('../utils/media.js');
    return saveMedia(buffer, userId, 'pdf', 'pdf');
  }

  private getFilenameFromUrl(sourceUrl: string): string {
    try {
      const parsed = new URL(sourceUrl);
      return parsed.pathname.split('/').pop() || '';
    } catch {
      return '';
    }
  }

  private async reply(chatId: string, rawText: string): Promise<void> {
    const cleaned = stripMarkdown(rawText);
    const chunks = splitLongText(cleaned);
    for (const chunk of chunks) {
      await this.client.sendMessage(chatId, chunk);
    }
  }
}

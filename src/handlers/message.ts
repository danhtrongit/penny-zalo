/**
 * ==========================================
 * 💬 Message Handler (Phase 4 — Full features)
 * ==========================================
 * Routes messages through AI intent detection:
 * - expense → parse + save to DB
 * - set_budget → save budget
 * - view_report → generate report
 * - view_history → show transactions
 * - general_chat → streaming AI with persona
 */

import type { Telegraf, Context } from 'telegraf';
import { message } from 'telegraf/filters';
import { detectIntent } from '../services/parser.js';
import { saveExpenses, forceSaveExpense } from '../services/expense.js';
import { chatStream } from '../services/ai.js';
import { formatCurrency } from '../utils/currency.js';
import { CATEGORY_EMOJI, type Category, type DetectedIntent } from '../types/index.js';
import { isWaitingForName, handleNameInput } from '../commands/start.js';
import { isWaitingForToneName, handleToneNameInput } from '../commands/tone.js';
import { isWaitingForBudget, handleBudgetInput } from '../commands/limit.js';
import { setBudget } from '../database/repositories/budget.repo.js';
import { getReportData, formatReport } from '../services/report.js';
import { getHistory } from '../services/history.js';
import { processReceiptImage } from '../services/ocr.js';
import { processPDF } from '../services/pdf.js';
import { addUserMessage, addAssistantMessage, getConversationContext } from '../services/memory.js';
import { saveMedia, getMediaAbsolutePath } from '../utils/media.js';
import { getTransactionsWithMedia } from '../database/repositories/transaction.repo.js';
import { formatCurrency as formatCurrencyUtil } from '../utils/currency.js';
import logger from '../utils/logger.js';
import fs from 'fs';

/** Minimum interval (ms) between Telegram editMessage calls */
const EDIT_INTERVAL_MS = 800;
const TYPING_CURSOR = ' ▍';

/** Pending duplicate confirmations */
const pendingDuplicates = new Map<string, {
  userId: number;
  amount: number;
  description: string;
  category: string;
  rawInput: string;
  date?: string;
}>();

export function registerMessageHandler(bot: Telegraf<Context>): void {
  // --- Handle callback queries (duplicate confirmation + noop) ---
  bot.on('callback_query', async (ctx) => {
    const data = 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;
    if (!data) return;

    // Ignore noop buttons (used for slider labels)
    if (data === '_noop') {
      await ctx.answerCbQuery();
      return;
    }

    const chatId = ctx.chat?.id;
    if (!chatId) return;

    if (data.startsWith('dup_confirm:') || data.startsWith('dup_skip:')) {
      const amount = parseFloat(data.split(':')[1]);
      const key = `${chatId}:${amount}`;
      const pending = pendingDuplicates.get(key);

      if (!pending) {
        await ctx.answerCbQuery('⏰ Đã hết thời gian xác nhận');
        return;
      }

      if (data.startsWith('dup_confirm:')) {
        const tx = await forceSaveExpense(
          pending.userId,
          pending.amount,
          pending.description,
          pending.category,
          pending.rawInput,
          pending.date
        );
        const emoji = CATEGORY_EMOJI[tx.category as Category] || '📦';
        await ctx.editMessageText(`✅ Đã lưu: ${emoji} ${tx.description}: ${formatCurrency(tx.amount)}`);
        await ctx.answerCbQuery('Đã lưu!');
      } else {
        await ctx.editMessageText('❌ Đã bỏ qua khoản này.');
        await ctx.answerCbQuery('Đã bỏ qua!');
      }

      pendingDuplicates.delete(key);
    }
  });

  // --- Handle text messages ---
  bot.on(message('text'), async (ctx) => {
    const userMessage = ctx.message.text;
    if (userMessage.startsWith('/')) return;

    if (!ctx.dbUser) {
      await ctx.reply('⚠️ Có lỗi xác thực, vui lòng thử /start lại.');
      return;
    }

    // --- Intercept: onboarding name input ---
    if (isWaitingForName(ctx.dbUser.telegramId)) {
      await handleNameInput(ctx);
      return;
    }

    // --- Intercept: /tone name input ---
    if (isWaitingForToneName(ctx.dbUser.telegramId)) {
      await handleToneNameInput(ctx);
      return;
    }

    // --- Intercept: /limit budget amount input ---
    if (isWaitingForBudget(ctx.dbUser.telegramId)) {
      await handleBudgetInput(ctx);
      return;
    }

    const typingInterval = setInterval(() => {
      ctx.sendChatAction('typing').catch(() => {});
    }, 4000);

    try {
      await ctx.sendChatAction('typing');

      // Record user message in memory BEFORE parsing for context
      addUserMessage(ctx.dbUser.telegramId, userMessage);

      // Step 1: Detect intent (with conversation history)
      const conversationCtx = getConversationContext(ctx.dbUser.telegramId);
      const intent = await detectIntent(userMessage, conversationCtx || undefined);

      switch (intent.intent) {
        case 'expense': {
          await handleExpense(ctx, intent, userMessage);
          break;
        }

        case 'set_budget': {
          if (intent.budget) {
            await setBudget(ctx.dbUser.id, intent.budget.period, intent.budget.amount);
            const periodLabel = intent.budget.period === 'week' ? 'tuần' : 'tháng';

            // Persona-aware confirmation
            let response = '';
            const prompt = `Người dùng vừa đặt ngân sách ${periodLabel} ${formatCurrency(intent.budget.amount)}. Xác nhận ngắn gọn 1-2 câu theo persona.`;
            for await (const chunk of chatStream(prompt, ctx.dbUser.id)) {
              response += chunk;
            }
            await ctx.reply(response || `✅ Đã đặt ngân sách ${periodLabel}: ${formatCurrency(intent.budget.amount)}`);
          }
          break;
        }

        case 'view_report': {
          const data = await getReportData(ctx.dbUser.id);
          const report = formatReport(data);
          await ctx.reply(report, { parse_mode: 'Markdown' });
          break;
        }

        case 'view_history': {
          const history = await getHistory(ctx.dbUser.id, intent.history_period ?? undefined);
          await ctx.reply(history, { parse_mode: 'Markdown' });
          break;
        }

        case 'update_expense': {
          // User wants to update/correct previous expenses
          // Use AI with context to handle this
          const updatePrompt = `Người dùng muốn sửa/cập nhật chi tiêu đã ghi trước đó.
Tin nhắn: "${userMessage}"

Nếu user nói thiếu hoặc sai, hãy hỏi cụ thể cần sửa/thêm gì.
Nếu user cung cấp đủ thông tin (tên khoản + số tiền), ghi nhận là expense mới.
Trả lời ngắn gọn 1-3 câu theo persona, hỏi rõ ràng.`;
          await handleStreaming(ctx, updatePrompt);
          break;
        }

        case 'greeting':
        case 'general_chat':
        default: {
          // Check if user is asking about a receipt/invoice
          const receiptQuery = isReceiptQuery(userMessage);
          if (receiptQuery) {
            await handleReceiptQuery(ctx, userMessage);
          } else {
            await handleStreaming(ctx, userMessage);
          }
          break;
        }
      }
    } catch (error) {
      logger.error('Message handler error:', (error as Error).message);
      await ctx.reply('😵 Có lỗi xảy ra, vui lòng thử lại!');
    } finally {
      clearInterval(typingInterval);
    }
  });

  // --- Handle other message types ---
  bot.on(message('sticker'), (ctx) =>
    ctx.reply('😄 Sticker đẹp đó! Nhắn gì cho mình đi nào~')
  );

  bot.on(message('photo'), async (ctx) => {
    if (!ctx.dbUser) return;

    const reply = await ctx.reply('📸 Đang đọc hóa đơn...');

    try {
      // Get largest photo
      const photos = ctx.message.photo;
      const photo = photos[photos.length - 1];
      const file = await ctx.telegram.getFile(photo.file_id);
      const fileUrl = `https://api.telegram.org/file/bot${ctx.telegram.token}/${file.file_path}`;

      // Download image
      const response = await fetch(fileUrl);
      const buffer = Buffer.from(await response.arrayBuffer());
      const ext = file.file_path?.split('.').pop() || 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

      // Save original image to disk
      const mediaPath = saveMedia(buffer, ctx.dbUser.id, 'image', ext);

      const result = await processReceiptImage(buffer, mimeType, ctx.dbUser.id, mediaPath);

      await ctx.telegram.editMessageText(
        reply.chat.id, reply.message_id, undefined,
        result.message,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      logger.error('Photo handler error:', (error as Error).message);
      await ctx.telegram.editMessageText(
        reply.chat.id, reply.message_id, undefined,
        '😅 Có lỗi khi xử lý ảnh. Bạn thử gửi lại hoặc nhập bằng text nhé!'
      );
    }
  });

  bot.on(message('voice'), (ctx) =>
    ctx.reply('🎤 Mình chưa nghe được tin nhắn thoại. Hãy gõ text nhé!')
  );

  bot.on(message('document'), async (ctx) => {
    if (!ctx.dbUser) return;

    const doc = ctx.message.document;
    if (!doc.mime_type?.includes('pdf')) {
      await ctx.reply('📄 Hiện tại mình chỉ đọc được file PDF. Bạn gửi PDF hoặc ảnh nhé!');
      return;
    }

    const reply = await ctx.reply('📄 Đang đọc file PDF...');

    try {
      const file = await ctx.telegram.getFile(doc.file_id);
      const fileUrl = `https://api.telegram.org/file/bot${ctx.telegram.token}/${file.file_path}`;

      const response = await fetch(fileUrl);
      const buffer = Buffer.from(await response.arrayBuffer());

      // Save original PDF to disk
      const mediaPath = saveMedia(buffer, ctx.dbUser.id, 'pdf', 'pdf');

      const result = await processPDF(buffer, ctx.dbUser.id, mediaPath);

      await ctx.telegram.editMessageText(
        reply.chat.id, reply.message_id, undefined,
        result.message,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      logger.error('Document handler error:', (error as Error).message);
      await ctx.telegram.editMessageText(
        reply.chat.id, reply.message_id, undefined,
        '😅 Có lỗi khi đọc file. Bạn thử gửi lại hoặc nhập bằng text nhé!'
      );
    }
  });
}

/**
 * Handle expense intent — save to DB and respond
 */
async function handleExpense(
  ctx: Context,
  intent: DetectedIntent,
  rawInput: string
): Promise<void> {
  const parsed = intent.expense;
  if (!parsed || !parsed.items || parsed.items.length === 0) {
    await handleStreaming(ctx, rawInput);
    return;
  }

  const result = await saveExpenses(ctx.dbUser.id, parsed, rawInput);

  if (result.hasDuplicate && result.duplicateAmount) {
    const key = `${ctx.chat!.id}:${result.duplicateAmount}`;
    const item = parsed.items[0];

    pendingDuplicates.set(key, {
      userId: ctx.dbUser.id,
      amount: item.amount,
      description: item.description,
      category: item.category,
      rawInput,
      date: parsed.date ?? undefined,
    });

    setTimeout(() => pendingDuplicates.delete(key), 120_000);

    await ctx.reply(
      `⚠️ Gần đây đã có khoản ${formatCurrency(item.amount)} rồi. Bạn muốn thêm mới không?`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Thêm mới', callback_data: `dup_confirm:${item.amount}` },
              { text: '❌ Bỏ qua', callback_data: `dup_skip:${item.amount}` },
            ],
          ],
        },
      }
    );
    return;
  }

  if (result.saved.length === 1) {
    // Single expense — generate persona-aware confirmation
    await handleExpenseResponse(ctx, result.summary, rawInput);
  } else {
    await ctx.reply(`✅ Đã ghi ${result.saved.length} khoản:\n${result.summary}`);
  }
}

/**
 * Generate a persona-aware expense confirmation
 */
async function handleExpenseResponse(
  ctx: Context,
  summary: string,
  rawInput: string
): Promise<void> {
  // Use AI to generate a persona-flavored confirmation
  const prompt = `Người dùng vừa ghi chi tiêu: "${rawInput}"\nĐã lưu: ${summary}\n\nHãy xác nhận ngắn gọn (1-2 câu) theo đúng giọng điệu/persona hiện tại. KHÔNG giải thích dài dòng hoặc hỏi lại.`;

  let response = '';
    for await (const chunk of chatStream(prompt, ctx.dbUser.id, ctx.dbUser.telegramId)) {
      response += chunk;
    }

    addAssistantMessage(ctx.dbUser.telegramId, response.substring(0, 200));
    await ctx.reply(response || `✅ Đã ghi: ${summary}`);
}

/**
 * Handle streaming AI response (persona-aware)
 */
async function handleStreaming(ctx: Context, userMessage: string): Promise<void> {
  const sentMessage = await ctx.reply('💭 Đang suy nghĩ...');
  const chatId = sentMessage.chat.id;
  const messageId = sentMessage.message_id;

  let fullText = '';
  let lastEditTime = 0;
  let pendingEdit = false;

  const startTime = Date.now();

  const editMessage = async (text: string, isFinal = false): Promise<void> => {
    const now = Date.now();
    if (!isFinal && now - lastEditTime < EDIT_INTERVAL_MS) {
      pendingEdit = true;
      return;
    }
    try {
      const displayText = isFinal ? text : text + TYPING_CURSOR;
      await ctx.telegram.editMessageText(chatId, messageId, undefined, displayText);
      lastEditTime = Date.now();
      pendingEdit = false;
    } catch {
      // Ignore "message is not modified" errors
    }
  };

  // Pass userId + telegramId for persona-aware prompt + memory
  for await (const chunk of chatStream(userMessage, ctx.dbUser.id, ctx.dbUser.telegramId)) {
    fullText += chunk;
    await editMessage(fullText);
  }

  if (pendingEdit || fullText) {
    await editMessage(fullText || '😵 Không nhận được phản hồi.', true);
  }

  // Record assistant response in memory
  addAssistantMessage(ctx.dbUser.telegramId, fullText.substring(0, 500));

  const elapsed = Date.now() - startTime;
  logger.info(`⏱️ Streaming response completed in ${elapsed}ms`);
}

/**
 * Check if user is asking about a receipt/invoice
 */
function isReceiptQuery(message: string): boolean {
  const lower = message.toLowerCase();
  const keywords = [
    'hóa đơn', 'hoá đơn', 'bill', 'receipt',
    'ảnh bill', 'ảnh hóa đơn', 'xem lại bill', 'xem hóa đơn',
    'gửi lại hóa đơn', 'gửi lại bill', 'gửi bill',
    'tìm hóa đơn', 'tìm bill', 'xem ảnh',
    'hôm qua ăn gì', 'chi gì hôm',
  ];
  return keywords.some(kw => lower.includes(kw));
}

/**
 * Handle receipt query — find and send back original receipt images
 */
async function handleReceiptQuery(ctx: Context, userMessage: string): Promise<void> {
  const receipts = await getTransactionsWithMedia(ctx.dbUser.id, 10);

  if (receipts.length === 0) {
    await handleStreaming(ctx, userMessage);
    return;
  }

  // Build a summary of available receipts for the AI
  const receiptList = receipts.map((tx, i) =>
    `${i + 1}. ${tx.description} — ${formatCurrencyUtil(tx.amount)} (${new Date(tx.transactionDate).toLocaleDateString('vi-VN')})`
  ).join('\n');

  // Send the most recent receipts (up to 3)
  const toSend = receipts.slice(0, 3);
  let sentCount = 0;

  for (const tx of toSend) {
    if (!tx.mediaPath) continue;

    const absPath = getMediaAbsolutePath(tx.mediaPath);
    if (!fs.existsSync(absPath)) continue;

    try {
      const isPdf = tx.mediaPath.endsWith('.pdf');
      if (isPdf) {
        await ctx.replyWithDocument({
          source: absPath,
          filename: `receipt_${tx.id}.pdf`,
        }, {
          caption: `📄 ${tx.description}\n💰 ${formatCurrencyUtil(tx.amount)} — ${new Date(tx.transactionDate).toLocaleDateString('vi-VN')}`,
        });
      } else {
        await ctx.replyWithPhoto({
          source: absPath,
        }, {
          caption: `📸 ${tx.description}\n💰 ${formatCurrencyUtil(tx.amount)} — ${new Date(tx.transactionDate).toLocaleDateString('vi-VN')}`,
        });
      }
      sentCount++;
    } catch (err) {
      logger.error(`Failed to send receipt ${tx.id}:`, (err as Error).message);
    }
  }

  if (sentCount === 0) {
    // No files could be sent, fall back to text response
    await handleStreaming(ctx, userMessage);
    return;
  }

  // Send AI commentary
  const prompt = `Người dùng hỏi về hóa đơn. Mình vừa gửi lại ${sentCount} ảnh/file hóa đơn gần đây nhất.\n\nDanh sách hóa đơn có ảnh:\n${receiptList}\n\nPhản hồi ngắn gọn 1-2 câu theo persona, xác nhận đã gửi lại.`;
  let response = '';
  for await (const chunk of chatStream(prompt, ctx.dbUser.id, ctx.dbUser.telegramId)) {
    response += chunk;
  }
  if (response) {
    await ctx.reply(response);
  }
}

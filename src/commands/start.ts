/**
 * ==========================================
 * 🚀 /start Command — Onboarding Flow
 * ==========================================
 * Multi-step setup:
 * 1. Welcome → Choose preset role
 * 2. Choose role → Ask for name
 * 3. Enter name → Choose gender
 * 4. Choose gender → Done!
 *
 * Uses inline keyboards + callback queries.
 */

import type { Telegraf, Context } from 'telegraf';
import { getOrCreatePersona, updatePersona } from '../database/repositories/persona.repo.js';
import { PRESET_DEFAULTS } from '../services/persona.js';
import config from '../config/index.js';
import type { PersonaPreset } from '../types/index.js';

/** Track users who are in "waiting for name" state */
const waitingForName = new Set<number>();

export function registerStartCommand(bot: Telegraf<Context>): void {
  // --- /start command ---
  bot.start(async (ctx) => {
    if (!ctx.dbUser) return;

    // Ensure persona exists
    await getOrCreatePersona(ctx.dbUser.id);

    const name = ctx.from?.first_name || 'bạn';

    await ctx.reply(
      `👋 Chào ${name}!\n\n` +
      `Mình là *${config.bot.name}* — trợ lý chi tiêu cá nhân của bạn.\n\n` +
      `Trước khi bắt đầu, hãy chọn phong cách nói chuyện mà bạn thích nhé! 👇`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '👫 Bạn thân', callback_data: 'preset:bạn thân' },
              { text: '💼 Trợ lý', callback_data: 'preset:trợ lý' },
            ],
            [
              { text: '🏠 Nội trợ', callback_data: 'preset:nội trợ' },
              { text: '💪 Huấn luyện viên', callback_data: 'preset:huấn luyện viên' },
            ],
            [
              { text: '🤡 Hề', callback_data: 'preset:hề' },
            ],
          ],
        },
      }
    );
  });

  // --- Handle preset selection ---
  bot.action(/^preset:(.+)$/, async (ctx) => {
    if (!ctx.dbUser) return;

    const preset = ctx.match[1] as PersonaPreset;
    const defaults = PRESET_DEFAULTS[preset];

    if (!defaults) {
      await ctx.answerCbQuery('❌ Lỗi chọn vai trò');
      return;
    }

    // Save preset + default slider values
    await updatePersona(ctx.dbUser.id, {
      preset,
      sarcasmLevel: defaults.sarcasm,
      seriousnessLevel: defaults.seriousness,
      frugalityLevel: defaults.frugality,
      emojiLevel: defaults.emoji,
    });

    const presetLabels: Record<string, string> = {
      'bạn thân': '👫 Bạn thân — vui vẻ, gần gũi, hay trêu chọc',
      'trợ lý': '💼 Trợ lý — chuyên nghiệp, ngắn gọn, rõ ràng',
      'nội trợ': '🏠 Nội trợ — quan tâm chi tiết, tiết kiệm',
      'huấn luyện viên': '💪 Huấn luyện viên — nghiêm khắc, kỷ luật',
      'hề': '🤡 Hề — roast mạnh, hài hước đậm',
    };

    await ctx.editMessageText(
      `✅ Đã chọn: *${presetLabels[preset]}*\n\n` +
      `Bạn muốn ${config.bot.name} gọi bạn là gì? Nhập tên/nickname nhé! 👇\n\n` +
      `_(Hoặc bấm "Bỏ qua" để dùng tên Telegram)_`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '⏭️ Bỏ qua', callback_data: 'name:skip' }],
          ],
        },
      }
    );

    // Mark user as waiting for name input
    waitingForName.add(ctx.dbUser.telegramId);
    await ctx.answerCbQuery();
  });

  // --- Handle name skip ---
  bot.action('name:skip', async (ctx) => {
    if (!ctx.dbUser) return;

    waitingForName.delete(ctx.dbUser.telegramId);

    // Use Telegram first name as display name
    const telegramName = ctx.from?.first_name || '';
    await updatePersona(ctx.dbUser.id, { displayName: telegramName });

    await ctx.editMessageText(
      `👌 Được rồi, mình sẽ gọi bạn là *${telegramName}*!\n\n` +
      `Chọn giới tính để mình xưng hô tự nhiên hơn nhé:`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '👨 Nam', callback_data: 'gender:nam' },
              { text: '👩 Nữ', callback_data: 'gender:nữ' },
              { text: '🤷 Khác', callback_data: 'gender:khác' },
            ],
            [{ text: '⏭️ Bỏ qua', callback_data: 'gender:skip' }],
          ],
        },
      }
    );

    await ctx.answerCbQuery();
  });

  // --- Handle gender selection ---
  bot.action(/^gender:(.+)$/, async (ctx) => {
    if (!ctx.dbUser) return;

    const gender = ctx.match[1];
    if (gender !== 'skip') {
      await updatePersona(ctx.dbUser.id, { gender });
    }

    const persona = await getOrCreatePersona(ctx.dbUser.id);
    const displayName = persona.displayName || ctx.from?.first_name || 'bạn';

    await ctx.editMessageText(
      `🎉 *Cài đặt hoàn tất!*\n\n` +
      `📋 Tóm tắt:\n` +
      `• Vai trò: *${persona.preset}*\n` +
      `• Tên gọi: *${displayName}*\n` +
      `• Giới tính: *${gender === 'skip' ? 'Chưa đặt' : gender}*\n` +
      `• Cà khịa: ${formatSlider(persona.sarcasmLevel)}\n` +
      `• Nghiêm túc: ${formatSlider(persona.seriousnessLevel)}\n` +
      `• Tiết kiệm: ${formatSlider(persona.frugalityLevel)}\n` +
      `• Emoji: ${formatSlider(persona.emojiLevel)}\n\n` +
      `💬 Giờ hãy nhắn chi tiêu cho mình nhé! Ví dụ:\n` +
      `_ăn trưa 50k_\n` +
      `_rau 30k, cá 50k_\n\n` +
      `📝 Gõ /tone để chỉnh lại bất cứ lúc nào.`,
      { parse_mode: 'Markdown' }
    );

    await ctx.answerCbQuery('🎉 Sẵn sàng!');
  });
}

/**
 * Check if user is currently in "waiting for name" state
 */
export function isWaitingForName(telegramId: number): boolean {
  return waitingForName.has(telegramId);
}

/**
 * Handle name input from user during onboarding
 */
export async function handleNameInput(ctx: Context): Promise<void> {
  if (!ctx.dbUser || !ctx.message || !('text' in ctx.message)) return;

  const name = ctx.message.text.trim();
  waitingForName.delete(ctx.dbUser.telegramId);

  await updatePersona(ctx.dbUser.id, { displayName: name });

  await ctx.reply(
    `👌 Tuyệt, mình sẽ gọi bạn là *${name}*!\n\n` +
    `Chọn giới tính để mình xưng hô tự nhiên hơn nhé:`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '👨 Nam', callback_data: 'gender:nam' },
            { text: '👩 Nữ', callback_data: 'gender:nữ' },
            { text: '🤷 Khác', callback_data: 'gender:khác' },
          ],
          [{ text: '⏭️ Bỏ qua', callback_data: 'gender:skip' }],
        ],
      },
    }
  );
}

/**
 * Format slider value as visual bar
 */
function formatSlider(level: number): string {
  const filled = '█'.repeat(level);
  const empty = '░'.repeat(10 - level);
  return `${filled}${empty} ${level}/10`;
}

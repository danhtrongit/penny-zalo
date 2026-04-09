/**
 * ==========================================
 * 🎭 /tone Command — Adjust Persona Settings
 * ==========================================
 * Inline keyboard interface for:
 * - Changing preset role
 * - Adjusting 4 sliders (+/-)
 * - Changing display name
 */

import type { Telegraf, Context } from 'telegraf';
import { getOrCreatePersona, updatePersona } from '../database/repositories/persona.repo.js';
import { PRESET_DEFAULTS } from '../services/persona.js';
import type { PersonaPreset } from '../types/index.js';

/** Track users waiting for name input via /tone */
const waitingForToneName = new Set<number>();

export function registerToneCommand(bot: Telegraf<Context>): void {
  // --- /tone command: show current settings ---
  bot.command('tone', async (ctx) => {
    if (!ctx.dbUser) return;
    await showToneMenu(ctx);
  });

  // --- Preset change ---
  bot.action(/^tone_preset:(.+)$/, async (ctx) => {
    if (!ctx.dbUser) return;

    const preset = ctx.match[1] as PersonaPreset;
    const defaults = PRESET_DEFAULTS[preset];
    if (!defaults) return ctx.answerCbQuery('❌ Lỗi');

    await updatePersona(ctx.dbUser.id, {
      preset,
      sarcasmLevel: defaults.sarcasm,
      seriousnessLevel: defaults.seriousness,
      frugalityLevel: defaults.frugality,
      emojiLevel: defaults.emoji,
    });

    await ctx.answerCbQuery(`✅ Đã chuyển sang: ${preset}`);
    await showToneMenu(ctx, true);
  });

  // --- Slider adjustments ---
  bot.action(/^tone_adj:(\w+):(up|down)$/, async (ctx) => {
    if (!ctx.dbUser) return;

    const field = ctx.match[1] as 'sarcasm' | 'seriousness' | 'frugality' | 'emoji';
    const direction = ctx.match[2];

    const persona = await getOrCreatePersona(ctx.dbUser.id);

    const fieldMap = {
      sarcasm: 'sarcasmLevel',
      seriousness: 'seriousnessLevel',
      frugality: 'frugalityLevel',
      emoji: 'emojiLevel',
    } as const;

    const dbField = fieldMap[field];
    const current = persona[dbField] as number;
    const newValue = direction === 'up'
      ? Math.min(10, current + 1)
      : Math.max(0, current + (- 1));

    if (newValue === current) {
      await ctx.answerCbQuery(direction === 'up' ? '⬆️ Đã max!' : '⬇️ Đã min!');
      return;
    }

    await updatePersona(ctx.dbUser.id, { [dbField]: newValue });

    await ctx.answerCbQuery(`${direction === 'up' ? '⬆️' : '⬇️'} ${newValue}/10`);
    await showToneMenu(ctx, true);
  });

  // --- Change name via /tone ---
  bot.action('tone_name', async (ctx) => {
    if (!ctx.dbUser) return;

    waitingForToneName.add(ctx.dbUser.telegramId);

    await ctx.editMessageText(
      '✏️ Nhập tên mới mà bạn muốn mình gọi:',
    );
    await ctx.answerCbQuery();
  });

  // --- Back to tone menu ---
  bot.action('tone_back', async (ctx) => {
    if (!ctx.dbUser) return;
    await showToneMenu(ctx, true);
    await ctx.answerCbQuery();
  });

  // --- Change preset submenu ---
  bot.action('tone_presets', async (ctx) => {
    if (!ctx.dbUser) return;

    await ctx.editMessageText(
      '🎭 Chọn vai trò mới cho Penny:',
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '👫 Bạn thân', callback_data: 'tone_preset:bạn thân' },
              { text: '💼 Trợ lý', callback_data: 'tone_preset:trợ lý' },
            ],
            [
              { text: '🏠 Nội trợ', callback_data: 'tone_preset:nội trợ' },
              { text: '💪 HLV', callback_data: 'tone_preset:huấn luyện viên' },
            ],
            [
              { text: '🤡 Hề', callback_data: 'tone_preset:hề' },
            ],
            [{ text: '◀️ Quay lại', callback_data: 'tone_back' }],
          ],
        },
      }
    );
    await ctx.answerCbQuery();
  });
}

/**
 * Check if user is waiting for tone name input
 */
export function isWaitingForToneName(telegramId: number): boolean {
  return waitingForToneName.has(telegramId);
}

/**
 * Handle name input during /tone flow
 */
export async function handleToneNameInput(ctx: Context): Promise<void> {
  if (!ctx.dbUser || !ctx.message || !('text' in ctx.message)) return;

  const name = ctx.message.text.trim();
  waitingForToneName.delete(ctx.dbUser.telegramId);

  await updatePersona(ctx.dbUser.id, { displayName: name });

  await ctx.reply(`✅ Đã đổi tên thành *${name}*! Gõ /tone để xem cài đặt.`, {
    parse_mode: 'Markdown',
  });
}

/**
 * Show the tone settings menu
 */
async function showToneMenu(ctx: Context, edit = false): Promise<void> {
  if (!ctx.dbUser) return;

  const persona = await getOrCreatePersona(ctx.dbUser.id);
  const displayName = persona.displayName || ctx.from?.first_name || '?';

  const presetEmojis: Record<string, string> = {
    'bạn thân': '👫',
    'trợ lý': '💼',
    'nội trợ': '🏠',
    'huấn luyện viên': '💪',
    'hề': '🤡',
  };

  const presetEmoji = presetEmojis[persona.preset] || '🎭';

  const text =
    `🎭 *Cài đặt Tone của Penny*\n\n` +
    `${presetEmoji} Vai trò: *${persona.preset}*\n` +
    `👤 Tên gọi: *${displayName}*\n\n` +
    `🔥 Cà khịa:   ${formatBar(persona.sarcasmLevel)}\n` +
    `📏 Nghiêm túc: ${formatBar(persona.seriousnessLevel)}\n` +
    `💰 Tiết kiệm:  ${formatBar(persona.frugalityLevel)}\n` +
    `😄 Emoji:      ${formatBar(persona.emojiLevel)}\n\n` +
    `_Dùng nút ➖ ➕ để chỉnh từng mức_`;

  const keyboard = {
    inline_keyboard: [
      // Sliders with +/- buttons
      [
        { text: '➖', callback_data: 'tone_adj:sarcasm:down' },
        { text: `🔥 Khịa ${persona.sarcasmLevel}`, callback_data: '_noop' },
        { text: '➕', callback_data: 'tone_adj:sarcasm:up' },
      ],
      [
        { text: '➖', callback_data: 'tone_adj:seriousness:down' },
        { text: `📏 Nghiêm ${persona.seriousnessLevel}`, callback_data: '_noop' },
        { text: '➕', callback_data: 'tone_adj:seriousness:up' },
      ],
      [
        { text: '➖', callback_data: 'tone_adj:frugality:down' },
        { text: `💰 TK ${persona.frugalityLevel}`, callback_data: '_noop' },
        { text: '➕', callback_data: 'tone_adj:frugality:up' },
      ],
      [
        { text: '➖', callback_data: 'tone_adj:emoji:down' },
        { text: `😄 Emoji ${persona.emojiLevel}`, callback_data: '_noop' },
        { text: '➕', callback_data: 'tone_adj:emoji:up' },
      ],
      // Actions
      [
        { text: '🎭 Đổi vai trò', callback_data: 'tone_presets' },
        { text: '✏️ Đổi tên', callback_data: 'tone_name' },
      ],
    ],
  };

  if (edit) {
    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    }).catch(() => {
      // If edit fails (e.g. message too old), send new
      ctx.reply(text, { parse_mode: 'Markdown', reply_markup: keyboard });
    });
  } else {
    await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: keyboard });
  }
}

function formatBar(level: number): string {
  const filled = '█'.repeat(level);
  const empty = '░'.repeat(10 - level);
  return `${filled}${empty} ${level}`;
}

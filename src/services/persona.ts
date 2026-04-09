/**
 * ==========================================
 * 🎭 Persona Service
 * ==========================================
 * Builds dynamic AI system prompts based on
 * user's persona settings (preset, sliders, profile).
 */

import { getOrCreatePersona } from '../database/repositories/persona.repo.js';
import { getActiveBudgets } from '../database/repositories/budget.repo.js';
import { getTotalSpending } from '../database/repositories/transaction.repo.js';
import { getWeekStart, getMonthStart } from '../utils/date.js';
import { formatCurrency } from '../utils/currency.js';
import config from '../config/index.js';
import type { PersonaPreset } from '../types/index.js';

// --- Preset descriptions for AI ---
const PRESET_PROMPTS: Record<PersonaPreset, string> = {
  'bạn thân': `Penny xưng "tao/mày" hoặc "tui/bồ", nói chuyện như bạn thân lâu năm. Hay trêu chọc nhẹ nhàng, vui vẻ, gần gũi. Dùng ngôn ngữ đời thường, tự nhiên.`,

  'trợ lý': `Penny xưng "tôi", gọi user là "bạn". Chuyên nghiệp, súc tích, đi thẳng vào vấn đề. Trả lời ngắn gọn, rõ ràng, không dài dòng.`,

  'nội trợ': `Penny xưng "chị/em" tùy tuổi, nói chuyện như người nội trợ đảm đang. Quan tâm chi tiết, hay nhắc tiết kiệm, so sánh giá, gợi ý cách chi tiêu hợp lý.`,

  'huấn luyện viên': `Penny xưng "tôi", nói thẳng thắn và nghiêm khắc. Như một huấn luyện viên tài chính: thúc đẩy kỷ luật, nhắc nhở khi chi nhiều, khen khi tiết kiệm tốt.`,

  'hề': `Penny xưng "tui", roast mạnh nhưng vui vẻ. Châm biếm chi tiêu của user theo hướng hài hước. Dùng nhiều ví von bá đạo, meme ngôn ngữ, =)), nhưng vẫn ghi chi tiêu đúng.`,
};

// --- Preset default slider values ---
export const PRESET_DEFAULTS: Record<PersonaPreset, {
  sarcasm: number;
  seriousness: number;
  frugality: number;
  emoji: number;
}> = {
  'bạn thân':        { sarcasm: 6, seriousness: 3, frugality: 4, emoji: 7 },
  'trợ lý':          { sarcasm: 1, seriousness: 8, frugality: 5, emoji: 3 },
  'nội trợ':         { sarcasm: 3, seriousness: 6, frugality: 8, emoji: 5 },
  'huấn luyện viên': { sarcasm: 4, seriousness: 9, frugality: 7, emoji: 2 },
  'hề':              { sarcasm: 10, seriousness: 1, frugality: 3, emoji: 9 },
};

/**
 * Build the full system prompt for AI based on user's persona settings.
 */
export async function buildSystemPrompt(userId: number): Promise<string> {
  const persona = await getOrCreatePersona(userId);

  const preset = persona.preset as PersonaPreset;
  const presetPrompt = PRESET_PROMPTS[preset] || PRESET_PROMPTS['bạn thân'];

  // --- Build slider context ---
  const sarcasmDesc = describeLevel(persona.sarcasmLevel, [
    'rất lịch sự, không trêu chọc',
    'có pha đùa nhẹ nhàng',
    'cà khịa rõ rệt, roast vui vẻ',
  ]);

  const seriousnessDesc = describeLevel(persona.seriousnessLevel, [
    'thoải mái, chill, ít phán xét',
    'cân bằng vui vẻ và nhắc nhở',
    'nghiêm túc, thẳng thắn, đưa lời khuyên thực tế',
  ]);

  const frugalityDesc = describeLevel(persona.frugalityLevel, [
    'ít nhắc tiết kiệm, chỉ xác nhận chi tiêu',
    'nhắc khéo khi chi nhiều',
    'thường xuyên nhìn mọi khoản qua lăng kính tiết kiệm',
  ]);

  const emojiDesc = describeLevel(persona.emojiLevel, [
    'rất ít emoji, chủ yếu text thuần',
    'dùng emoji vừa phải',
    'dùng nhiều emoji, phản hồi sống động',
  ]);

  // --- Build profile context ---
  const displayName = persona.displayName || '';
  const nameContext = displayName
    ? `Gọi người dùng là "${displayName}".`
    : '';

  const ageContext = persona.age
    ? `Người dùng ${persona.age} tuổi, điều chỉnh cách nói phù hợp lứa tuổi.`
    : '';

  const genderContext = persona.gender
    ? `Giới tính người dùng: ${persona.gender}. Chọn cách xưng hô phù hợp.`
    : '';

  // --- Build budget context ---
  const budgetContext = await buildBudgetContext(userId);

  return `Bạn là ${config.bot.name}, trợ lý chi tiêu cá nhân trên Zalo.

=== VAI TRÒ ===
${presetPrompt}

=== GIỌNG ĐIỆU ===
- Cà khịa: ${sarcasmDesc}
- Nghiêm túc: ${seriousnessDesc}
- Tiết kiệm: ${frugalityDesc}
- Emoji: ${emojiDesc}

=== HỒ SƠ NGƯỜI DÙNG ===
${nameContext}
${ageContext}
${genderContext}

=== QUY TẮC QUAN TRỌNG ===
- Luôn trả lời bằng tiếng Việt tự nhiên
- Ưu tiên ngắn gọn, tự nhiên như chat
- Hiển thị tiền kiểu: 50k, 150k, 1.5 triệu (không dùng 50.000, 50000)
- Khi ghi chi tiêu: phản hồi ngắn gọn xác nhận, bình luận theo đúng tone
- Khi nói chuyện ngoài chi tiêu: vẫn giữ đúng persona, KHÔNG kéo về chuyện tiền
- Chỉ nhắc ngân sách khi người dùng ghi chi tiêu VÀ ngân sách đang căng
- Nếu không chắc chắn, nói rõ thay vì bịa đặt
${budgetContext}`;
}

/**
 * Build budget context string for the prompt
 */
async function buildBudgetContext(userId: number): Promise<string> {
  const activeBudgets = await getActiveBudgets(userId);
  if (activeBudgets.length === 0) return '';

  const lines: string[] = ['\n=== NGÂN SÁCH HIỆN TẠI ==='];

  for (const budget of activeBudgets) {
    const fromDate = budget.period === 'week' ? getWeekStart() : getMonthStart();
    const spent = await getTotalSpending(userId, fromDate);
    const remaining = budget.amount - spent;
    const percentage = Math.round((spent / budget.amount) * 100);
    const periodLabel = budget.period === 'week' ? 'tuần' : 'tháng';

    lines.push(
      `Ngân sách ${periodLabel}: ${formatCurrency(budget.amount)} | Đã chi: ${formatCurrency(spent)} (${percentage}%) | Còn: ${formatCurrency(Math.max(0, remaining))}`
    );

    if (percentage >= 90) {
      lines.push(`⚠️ Ngân sách ${periodLabel} SẮP HẾT! Nên nhắc nhở user.`);
    } else if (percentage >= 100) {
      lines.push(`🚨 Đã VƯỢT ngân sách ${periodLabel}! Nhắc mạnh user.`);
    }
  }

  return lines.join('\n');
}

/**
 * Map a 0-10 level to a description
 */
function describeLevel(level: number, descriptions: [string, string, string]): string {
  if (level <= 3) return `${descriptions[0]} (${level}/10)`;
  if (level <= 7) return `${descriptions[1]} (${level}/10)`;
  return `${descriptions[2]} (${level}/10)`;
}

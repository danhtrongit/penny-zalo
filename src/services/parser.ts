/**
 * ==========================================
 * 🧠 Parser Service — Intent Detection + Expense Parsing
 * ==========================================
 * Uses Gemini structured output (JSON) to:
 * 1. Detect user intent (expense, budget, report, chat...)
 * 2. Parse expense details (amount, description, category, date)
 */

import { GoogleGenAI, Type } from '@google/genai';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import type { DetectedIntent } from '../types/index.js';

const ai = new GoogleGenAI({
  apiKey: config.ai.apiKey,
  httpOptions: {
    baseUrl: config.ai.baseURL,
    timeout: 20_000,
  },
});

/**
 * Detect user intent and parse structured data from a message.
 * Returns a DetectedIntent object with intent type and parsed data.
 */
export async function detectIntent(userMessage: string, conversationHistory?: string): Promise<DetectedIntent> {
  const startTime = Date.now();

  // Provide today's date for context
  const now = new Date();
  const todayStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

  // Build content with optional conversation history
  let content = `Hôm nay: ${todayStr}\n\n`;
  if (conversationHistory) {
    content += `=== LỊCH SỬ HỘI THOẠI GẦN NHẤT ===\n${conversationHistory}\n=== HẾT LỊCH SỬ ===\n\n`;
  }
  content += `Phân tích tin nhắn sau và trả về JSON:\n\n"${userMessage}"`;

  try {
    const response = await ai.models.generateContent({
      model: config.ai.model,
      contents: content,
      config: {
        systemInstruction: PARSER_PROMPT,
        temperature: 0.1, // Low temperature for consistent parsing
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            intent: {
              type: Type.STRING,
              enum: ['expense', 'set_budget', 'view_report', 'view_history', 'update_expense', 'greeting', 'general_chat'],
            },
            expense: {
              type: Type.OBJECT,
              nullable: true,
              properties: {
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      amount: { type: Type.NUMBER },
                      description: { type: Type.STRING },
                      category: {
                        type: Type.STRING,
                        enum: ['Ăn uống', 'Đi chợ', 'Di chuyển', 'Mua sắm', 'Sinh hoạt', 'Giải trí', 'Sức khỏe', 'Học tập', 'Quà tặng', 'Tiết kiệm', 'Đầu tư', 'Khác'],
                      },
                      date: { type: Type.STRING, nullable: true },
                    },
                    required: ['amount', 'description', 'category'],
                  },
                },
                date: { type: Type.STRING, nullable: true },
                is_expense: { type: Type.BOOLEAN },
              },
              required: ['items', 'is_expense'],
            },
            budget: {
              type: Type.OBJECT,
              nullable: true,
              properties: {
                period: { type: Type.STRING, enum: ['week', 'month'] },
                amount: { type: Type.NUMBER },
              },
              required: ['period', 'amount'],
            },
            history_period: { type: Type.STRING, nullable: true },
          },
          required: ['intent'],
        },
      },
    });

    const elapsed = Date.now() - startTime;
    const parsed = JSON.parse(response.text || '{}') as DetectedIntent;

    logger.info(`🎯 Intent detected: "${parsed.intent}" in ${elapsed}ms`);
    logger.debug('Parsed data:', JSON.stringify(parsed));

    return parsed;
  } catch (error) {
    logger.error(`❌ Parser error: ${(error as Error).message}`);

    // Default to general chat on parse failure
    return { intent: 'general_chat' };
  }
}

/**
 * System prompt for the parser AI.
 * Focused on accurate Vietnamese expense parsing.
 */
const PARSER_PROMPT = `Bạn là một parser chuyên phân tích tin nhắn tiếng Việt về chi tiêu cá nhân.
Bạn có thể xem LỊCH SỬ HỘI THOẠI để hiểu ngữ cảnh.

NHIỆM VỤ: Phân tích tin nhắn và trả về JSON với intent phù hợp.

CÁCH NHẬN DIỆN INTENT:

1. "expense" — Khi người dùng ghi chi tiêu:
   - "ăn trưa 50k" → expense, 1 item
   - "rau 30k, cá 50k" → expense, 2 items   
   - "ăn tối hôm qua 100k" → expense, date="hôm qua"
   - "grab 25k" → expense, category=Di chuyển
   - "cà phê 35k" → expense, category=Ăn uống

2. "set_budget" — Khi đặt ngân sách:
   - "đặt ngân sách tháng 5 triệu" → set_budget, month, 5000000
   - "hạn mức tuần 1 triệu" → set_budget, week, 1000000

3. "view_report" — Khi xin xem báo cáo:
   - "báo cáo tháng", "cho xem report", "thống kê chi tiêu"

4. "view_history" — Khi xin xem lịch sử:
   - "chi tiêu hôm nay", "hôm qua chi gì", "danh sách tháng này"
   - history_period: "hôm nay", "hôm qua", "tuần này", "tháng này"

5. "update_expense" — Khi user muốn SỬA/CẬP NHẬT chi tiêu đã ghi trước đó:
   - "thiếu" / "thiú" → user nói ghi thiếu, cần bổ sung
   - "sửa lại" / "update lại" / "update i" → muốn sửa khoản vừa ghi
   - "ghi đủ ngày kìa" / "ghi đủ ngày đi" → muốn ghi lại với đầy đủ ngày
   - "ghi lại đi" / "sửa giúp" → yêu cầu chỉnh sửa
   ⚠️ Khi thấy intent này, parse lại expense nếu có dữ liệu mới. Nếu không, trả update_expense.

6. "greeting" — Chào hỏi: "hi", "chào", "alo"

7. "general_chat" — Mọi thứ khác: hỏi chuyện, thời tiết, tin tức...

===========================================
QUY TẮC NGỮ CẢNH (RẤT QUAN TRỌNG):
===========================================
Khi tin nhắn NGẮN hoặc MƠ HỒ (ví dụ: "Thiếu", "Update", "K hiểu", "Ghi lại"), bạn PHẢI xem LỊCH SỬ HỘI THOẠI để hiểu user đang nói về cái gì.

Ví dụ:
- Lịch sử: Penny vừa ghi 3 khoản (bánh 64k, be tu 17k, bánh mì 40k)
  User nói: "Thiú" hoặc "Thiếu"
  → Hiểu: user nói ghi THIẾU khoản → intent = "update_expense"

- Lịch sử: User vừa ghi chi tiêu nhiều ngày nhưng Penny chỉ ghi 1 ngày
  User nói: "Ghi đủ ngày kìa" hoặc "Update lại"
  → Hiểu: user muốn sửa lại → intent = "update_expense"

- Lịch sử: Penny vừa trả lời gì đó
  User nói: "K hiểu hà"  
  → Hiểu: user không hiểu câu trả lời → intent = "general_chat"

===========================================
QUY TẮC PARSE TIỀN VIỆT (RẤT QUAN TRỌNG):
===========================================
Đơn vị tiền tệ luôn là VND. Tất cả chi tiêu hàng ngày đều tính bằng nghìn đồng (1000).

- "50k" = 50,000 đ
- "150k" = 150,000 đ
- "1.5 triệu" hoặc "1.5tr" = 1,500,000 đ
- "2tr" = 2,000,000 đ

⚠️ KHI KHÔNG CÓ ĐƠN VỊ (k, triệu, tr, đ):
- Số nguyên từ 1 đến 999 → LUÔN NHÂN VỚI 1000 (nghìn đồng)
  - "500" = 500,000 đ (500 nghìn)
  - "50" = 50,000 đ (50 nghìn)
  - "225" = 225,000 đ (225 nghìn)
  - "130" = 130,000 đ (130 nghìn)
  - "10" = 10,000 đ (10 nghìn)
  - "17" = 17,000 đ (17 nghìn)
- Số >= 1000 → giữ nguyên (đã là VND)
  - "50000" = 50,000 đ
  - "1500000" = 1,500,000 đ

===========================================
QUY TẮC PARSE NGÀY (RẤT QUAN TRỌNG):
===========================================
Mỗi item có thể có ngày riêng. Gán date vào TỪNG item nếu có.

Format date trả về: "DD/MM" hoặc "DD/MM/YYYY" hoặc "hôm qua", "hôm kia"

Ví dụ phức tạp:
"18/3:
64 tiền bánh
17k be tu
40k bánh mì

19/3
Áo bb 225"

→ Kết quả: 4 items:
  - {amount: 64000, description: "tiền bánh", date: "18/3", ...}
  - {amount: 17000, description: "be tu", date: "18/3", ...}
  - {amount: 40000, description: "bánh mì", date: "18/3", ...}
  - {amount: 225000, description: "Áo bb", date: "19/3", category: "Mua sắm", ...}

Chú ý: Khi user ghi "18/3:", dòng sau thuộc ngày 18/3. Khi ghi "19/3" tiếp, dòng sau chuyển sang ngày 19/3.

QUY TẮC PHÂN LOẠI DANH MỤC:
- Ăn/uống/cơm/phở/bún/café/trà/bia/bánh/cà phê/cf → "Ăn uống"
- Rau/thịt/cá/trứng/gạo/đi chợ → "Đi chợ"
- Grab/taxi/xăng/gửi xe/vé xe/be → "Di chuyển"
- Quần áo/giày/mỹ phẩm/áo/nón → "Mua sắm"
- Điện/nước/internet/thuê nhà → "Sinh hoạt"
- Phim/game/karaoke/du lịch/coi phim → "Giải trí"
- Thuốc/khám bệnh/gym → "Sức khỏe"
- Sách/khóa học/học phí → "Học tập"
- Quà/sinh nhật → "Quà tặng"
- Gửi tiết kiệm → "Tiết kiệm"
- Cổ phiếu/crypto → "Đầu tư"
- Còn lại → "Khác"`;

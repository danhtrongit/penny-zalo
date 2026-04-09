/**
 * ==========================================
 * 📸 OCR Service — Read receipts via Gemini Vision
 * ==========================================
 * Downloads image from Telegram, sends to Gemini
 * multimodal API for receipt extraction.
 * Supports multiple receipts in a single image.
 */

import { GoogleGenAI, Type } from '@google/genai';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { createTransaction } from '../database/repositories/transaction.repo.js';
import { formatCurrency } from '../utils/currency.js';
import { CATEGORY_EMOJI, type Category } from '../types/index.js';

const ai = new GoogleGenAI({
  apiKey: config.ai.apiKey,
  httpOptions: {
    baseUrl: config.ai.baseURL,
    timeout: 30_000,
  },
});

interface OCRResult {
  success: boolean;
  transactions: Array<{
    id: number;
    description: string;
    amount: number;
    category: string;
  }>;
  totalAmount: number;
  message: string;
}

/**
 * Parse a date string from OCR, handling 2-digit years correctly.
 * Returns an ISO string. Falls back to current date if unparseable.
 *
 * Common bill date formats:
 * - "2014-03-13" (Gemini YYYY-MM-DD)
 * - "13.03.14" (dd.mm.yy on receipt)
 * - "13/03/2014"
 */
function parseReceiptDate(dateStr: string | null | undefined): string {
  if (!dateStr) return new Date().toISOString();

  try {
    // Try standard YYYY-MM-DD first
    const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const month = parseInt(isoMatch[2], 10);
      const day = parseInt(isoMatch[3], 10);
      return buildSafeDate(year, month, day);
    }

    // Try dd.mm.yy or dd/mm/yy or dd-mm-yy
    const dmyShort = dateStr.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2})$/);
    if (dmyShort) {
      const day = parseInt(dmyShort[1], 10);
      const month = parseInt(dmyShort[2], 10);
      let year = parseInt(dmyShort[3], 10);
      // Convert 2-digit year: 00-99 → 2000-2099, then cap at current year
      year = 2000 + year;
      return buildSafeDate(year, month, day);
    }

    // Try dd.mm.yyyy or dd/mm/yyyy
    const dmyLong = dateStr.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
    if (dmyLong) {
      const day = parseInt(dmyLong[1], 10);
      const month = parseInt(dmyLong[2], 10);
      const year = parseInt(dmyLong[3], 10);
      return buildSafeDate(year, month, day);
    }

    // Fallback: try native Date parsing
    const fallback = new Date(dateStr);
    if (!isNaN(fallback.getTime())) {
      return capDateAtCurrentYear(fallback).toISOString();
    }
  } catch (e) {
    logger.warn(`⚠️ Could not parse receipt date: "${dateStr}"`);
  }

  return new Date().toISOString();
}

/**
 * Build a safe Date from year/month/day, ensuring it doesn't exceed current year.
 */
function buildSafeDate(year: number, month: number, day: number): string {
  const currentYear = new Date().getFullYear();
  // If year is in the future, use current year instead
  if (year > currentYear) {
    year = currentYear;
  }
  const date = new Date(year, month - 1, day);
  return date.toISOString();
}

/**
 * Cap a date at the current year. If the date is in the future, reset year to current.
 */
function capDateAtCurrentYear(date: Date): Date {
  const currentYear = new Date().getFullYear();
  if (date.getFullYear() > currentYear) {
    date.setFullYear(currentYear);
  }
  return date;
}

/**
 * Process a receipt image and save transactions.
 * Supports multiple receipts/bills in a single image.
 */
export async function processReceiptImage(
  imageBuffer: Buffer,
  mimeType: string,
  userId: number,
  mediaPath?: string,
): Promise<OCRResult> {
  logger.info('📸 Processing receipt image...');

  try {
    const response = await ai.models.generateContent({
      model: config.ai.model,
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: mimeType as any,
                data: imageBuffer.toString('base64'),
              },
            },
            {
              text: OCR_PROMPT,
            },
          ],
        },
      ],
      config: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            readable: { type: Type.BOOLEAN },
            bills: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  store_name: { type: Type.STRING, nullable: true },
                  date: { type: Type.STRING, nullable: true },
                  items: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        description: { type: Type.STRING },
                        amount: { type: Type.NUMBER },
                        category: {
                          type: Type.STRING,
                          enum: ['Ăn uống', 'Đi chợ', 'Di chuyển', 'Mua sắm', 'Sinh hoạt', 'Giải trí', 'Sức khỏe', 'Học tập', 'Quà tặng', 'Tiết kiệm', 'Đầu tư', 'Khác'],
                        },
                      },
                      required: ['description', 'amount', 'category'],
                    },
                  },
                  total: { type: Type.NUMBER },
                },
                required: ['items', 'total'],
              },
            },
          },
          required: ['readable', 'bills'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');

    if (!parsed.readable || !parsed.bills || parsed.bills.length === 0) {
      return {
        success: false,
        transactions: [],
        totalAmount: 0,
        message: '😅 Mình chưa đọc rõ hóa đơn này. Bạn thử gửi ảnh rõ hơn hoặc nhập bằng text nhé!',
      };
    }

    const allTransactions: OCRResult['transactions'] = [];
    const allLines: string[] = [];
    let grandTotal = 0;

    for (const bill of parsed.bills) {
      if (!bill.items || bill.items.length === 0) continue;

      const storeName = bill.store_name || 'Hóa đơn';
      const itemsSummary = bill.items.map((i: any) => i.description).join(', ');
      const description = `${storeName}: ${itemsSummary}`;
      const mainCategory = bill.items[0]?.category || 'Khác';
      const txDate = parseReceiptDate(bill.date);

      // Save as ONE transaction per bill
      const tx = await createTransaction({
        userId,
        amount: bill.total,
        description,
        category: mainCategory,
        rawInput: `[ảnh hóa đơn: ${storeName}]`,
        source: 'image',
        mediaPath: mediaPath || '',
        transactionDate: txDate,
      });

      allTransactions.push({
        id: tx.id,
        description: tx.description,
        amount: tx.amount,
        category: tx.category,
      });

      grandTotal += bill.total;

      const emoji = CATEGORY_EMOJI[mainCategory as Category] || '📦';

      // Build formatted response for this bill
      allLines.push(`📸 Đã đọc hóa đơn từ *${storeName}*:`);
      if (bill.items.length <= 5) {
        for (const item of bill.items) {
          const itemEmoji = CATEGORY_EMOJI[item.category as Category] || '📦';
          allLines.push(`  ${itemEmoji} ${item.description}: ${formatCurrency(item.amount)}`);
        }
      } else {
        allLines.push(`  📋 ${bill.items.length} món`);
      }
      allLines.push(`${emoji} *Tổng: ${formatCurrency(bill.total)}*`);
      allLines.push(`✅ Đã lưu vào danh mục: ${mainCategory}`);
      allLines.push(''); // blank line between bills
    }

    // If multiple bills, show grand total
    if (parsed.bills.length > 1) {
      allLines.push(`💰 *Tổng cộng ${parsed.bills.length} hóa đơn: ${formatCurrency(grandTotal)}*`);
    }

    return {
      success: true,
      transactions: allTransactions,
      totalAmount: grandTotal,
      message: allLines.join('\n').trim(),
    };
  } catch (error) {
    logger.error('OCR error:', (error as Error).message);
    return {
      success: false,
      transactions: [],
      totalAmount: 0,
      message: '😅 Có lỗi khi đọc hóa đơn. Bạn thử gửi lại ảnh rõ hơn hoặc nhập bằng text nhé!',
    };
  }
}

const OCR_PROMPT = `Đọc TẤT CẢ hóa đơn/bill trong ảnh. Có thể có NHIỀU hóa đơn trong cùng 1 ảnh.

Với MỖI hóa đơn, trích xuất:
1. Tên quán/cửa hàng (store_name)
2. Ngày trên hóa đơn nếu có (date, format YYYY-MM-DD). LƯU Ý: Nếu năm chỉ có 2 chữ số (ví dụ 14), hãy thêm 20 phía trước (ví dụ 2014). Giữ nguyên năm gốc trên hóa đơn, KHÔNG thay đổi thành năm hiện tại.
3. Danh sách các món/dòng tiền (items): mỗi item có description, amount (VND), category
4. Tổng tiền (total)

Trả về dạng { readable: true/false, bills: [...] } — mỗi bill là một hóa đơn riêng biệt.

Nếu không đọc rõ ảnh, set readable = false.

Danh mục: Ăn uống, Đi chợ, Di chuyển, Mua sắm, Sinh hoạt, Giải trí, Sức khỏe, Học tập, Quà tặng, Tiết kiệm, Đầu tư, Khác

Trả về JSON.`;

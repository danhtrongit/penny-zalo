/**
 * ==========================================
 * 📄 PDF Service — Read PDF receipts
 * ==========================================
 * Extract text from PDF, then send to Gemini
 * for expense parsing.
 */

import { GoogleGenAI, Type } from '@google/genai';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { createTransaction } from '../database/repositories/transaction.repo.js';
import { formatCurrency } from '../utils/currency.js';
import { CATEGORY_EMOJI, type Category } from '../types/index.js';
import { normalizeImportedTransactionDate } from './importedDate.js';

const ai = new GoogleGenAI({
  apiKey: config.ai.apiKey,
  httpOptions: {
    baseUrl: config.ai.baseURL,
    timeout: 30_000,
  },
});

interface PDFResult {
  success: boolean;
  message: string;
  totalAmount: number;
}

/**
 * Process a PDF document and extract expenses
 */
export async function processPDF(
  pdfBuffer: Buffer,
  userId: number,
  mediaPath?: string,
): Promise<PDFResult> {
  logger.info('📄 Processing PDF...');

  try {
    // Dynamic import pdf-parse (CommonJS module)
    const pdfParseModule = await import('pdf-parse') as any;
    const pdfParse = pdfParseModule.default || pdfParseModule;
    const data = await pdfParse(pdfBuffer);
    const text = data.text;

    if (!text || text.trim().length < 10) {
      return {
        success: false,
        message: '😅 File PDF này không có nội dung text đọc được. Thử gửi ảnh chụp hoặc nhập bằng text nhé!',
        totalAmount: 0,
      };
    }

    // Send extracted text to Gemini for parsing
    const response = await ai.models.generateContent({
      model: config.ai.model,
      contents: `Phân tích nội dung PDF sau và trích xuất các khoản chi tiêu:\n\n${text.substring(0, 3000)}`,
      config: {
        systemInstruction: PDF_PROMPT,
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            readable: { type: Type.BOOLEAN },
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
                  date: { type: Type.STRING, nullable: true },
                },
                required: ['description', 'amount', 'category'],
              },
            },
          },
          required: ['readable', 'items'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');

    if (!parsed.readable || !parsed.items || parsed.items.length === 0) {
      return {
        success: false,
        message: '😅 Mình không tìm thấy khoản chi tiêu nào trong PDF này. Kiểm tra lại file hoặc nhập bằng text nhé!',
        totalAmount: 0,
      };
    }

    // Save each item as a transaction
    const lines: string[] = ['📄 Đã đọc được từ PDF:'];
    let totalAmount = 0;

    for (const item of parsed.items) {
      const txDate = normalizeImportedTransactionDate(item.date);

      await createTransaction({
        userId,
        amount: item.amount,
        description: item.description,
        category: item.category,
        rawInput: '[PDF]',
        source: 'pdf',
        mediaPath: mediaPath || '',
        transactionDate: txDate,
      });

      const emoji = CATEGORY_EMOJI[item.category as Category] || '📦';
      lines.push(`  ${emoji} ${item.description}: ${formatCurrency(item.amount)}`);
      totalAmount += item.amount;
    }

    lines.push(`\n💰 *Tổng: ${formatCurrency(totalAmount)}* (${parsed.items.length} khoản)`);
    lines.push('✅ Đã lưu tất cả!');

    logger.info(`📄 PDF processed: ${parsed.items.length} items, total ${formatCurrency(totalAmount)}`);

    return {
      success: true,
      message: lines.join('\n'),
      totalAmount,
    };
  } catch (error) {
    logger.error('PDF error:', (error as Error).message);
    return {
      success: false,
      message: '😅 Có lỗi khi đọc file PDF. Bạn thử gửi lại hoặc nhập bằng text nhé!',
      totalAmount: 0,
    };
  }
}

const PDF_PROMPT = `Bạn chuyên trích xuất khoản chi tiêu từ nội dung PDF.

Phân tích nội dung và tìm các khoản chi/mua hàng. Mỗi khoản cần:
- description: mô tả ngắn
- amount: số tiền (VND)
- category: Ăn uống, Đi chợ, Di chuyển, Mua sắm, Sinh hoạt, Giải trí, Sức khỏe, Học tập, Quà tặng, Tiết kiệm, Đầu tư, Khác
- date: ngày nếu có (YYYY-MM-DD)

Nếu không tìm thấy khoản chi tiêu, set readable = false.`;

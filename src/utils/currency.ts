/**
 * ==========================================
 * 💰 Currency Formatting Utility
 * ==========================================
 * Vietnamese-style: 50k, 150k, 1.5 triệu
 */

/**
 * Format VND amount to natural Vietnamese style
 * @example
 * formatCurrency(500)       → "500đ"
 * formatCurrency(50000)     → "50k"
 * formatCurrency(150000)    → "150k"
 * formatCurrency(1500000)   → "1.5 triệu"
 * formatCurrency(10000000)  → "10 triệu"
 */
export function formatCurrency(amount: number): string {
  if (amount < 1000) {
    return `${amount}đ`;
  }

  if (amount < 1_000_000) {
    const k = amount / 1000;
    return Number.isInteger(k) ? `${k}k` : `${k.toFixed(1).replace(/\.0$/, '')}k`;
  }

  const million = amount / 1_000_000;
  if (Number.isInteger(million)) {
    return `${million} triệu`;
  }
  return `${million.toFixed(1).replace(/\.0$/, '')} triệu`;
}

/**
 * Parse Vietnamese currency input to number
 * @example
 * parseCurrency("50k")       → 50000
 * parseCurrency("1.5 triệu") → 1500000
 * parseCurrency("150000")    → 150000
 */
export function parseCurrency(input: string): number | null {
  const cleaned = input.trim().toLowerCase().replace(/,/g, '.');

  // "50k", "150k"
  const kMatch = cleaned.match(/^([\d.]+)\s*k$/);
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1000);

  // "1.5 triệu", "2 triệu"
  const trMatch = cleaned.match(/^([\d.]+)\s*(?:triệu|tr)$/);
  if (trMatch) return Math.round(parseFloat(trMatch[1]) * 1_000_000);

  // Plain number "150000"
  const num = parseFloat(cleaned);
  if (!isNaN(num)) return Math.round(num);

  return null;
}

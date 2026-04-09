export function formatCurrency(amount: number): string {
  if (amount < 1000) return `${amount}đ`;
  if (amount < 1_000_000) {
    const k = amount / 1000;
    return Number.isInteger(k) ? `${k}k` : `${k.toFixed(1).replace(/\.0$/, '')}k`;
  }
  const m = amount / 1_000_000;
  return Number.isInteger(m) ? `${m} triệu` : `${m.toFixed(1).replace(/\.0$/, '')} triệu`;
}

// Full VND format with dots: 3.700.000
export function formatVND(amount: number): string {
  return amount.toLocaleString('vi-VN');
}

// ====== SVG CATEGORY ICONS ======
// Each returns an SVG string for use as dangerouslySetInnerHTML or as a React component
export const CATEGORY_SVG: Record<string, string> = {
  'Ăn uống': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`,
  'Đi chợ': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>`,
  'Di chuyển': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`,
  'Mua sắm': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
  'Sinh hoạt': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`,
  'Giải trí': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/></svg>`,
  'Sức khỏe': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z"/></svg>`,
  'Học tập': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/></svg>`,
  'Quà tặng': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/></svg>`,
  'Tiết kiệm': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2"/><path d="M2 9.1C1.5 10 1 11.5 1 14"/><circle cx="12.5" cy="11.5" r=".5"/></svg>`,
  'Đầu tư': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`,
  'Cà phê': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/></svg>`,
  'Ăn trưa': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`,
  'Mỹ phẩm': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15.5 2.5-7 14"/><path d="M18 2a3.6 3.6 0 0 1 0 6"/><path d="M6 16a3.6 3.6 0 0 1 0 6"/><path d="M12 12a8 8 0 0 0-8 8"/><path d="M12 12a8 8 0 0 1 8-8"/></svg>`,
  'Khác': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>`,
};

// Legacy emoji map (kept for backward compatibility in some components)
export const CATEGORY_EMOJI: Record<string, string> = {
  'Ăn uống': '🍜',
  'Đi chợ': '🛒',
  'Di chuyển': '🚗',
  'Mua sắm': '🛍️',
  'Sinh hoạt': '🏠',
  'Giải trí': '🎮',
  'Sức khỏe': '💊',
  'Học tập': '📚',
  'Quà tặng': '🎁',
  'Tiết kiệm': '💎',
  'Đầu tư': '📈',
  'Cà phê': '☕',
  'Ăn trưa': '🍱',
  'Mỹ phẩm': '💄',
  'Khác': '📦',
};

// Map category to an icon color for the transaction list
export const CATEGORY_ICON_BG: Record<string, string> = {
  'Ăn uống': '#FFF3E0',
  'Đi chợ': '#E8F5E9',
  'Di chuyển': '#E3F2FD',
  'Mua sắm': '#FCE4EC',
  'Sinh hoạt': '#F3E5F5',
  'Giải trí': '#E8EAF6',
  'Sức khỏe': '#E0F7FA',
  'Học tập': '#FFF8E1',
  'Quà tặng': '#FFEBEE',
  'Tiết kiệm': '#E0F2F1',
  'Đầu tư': '#E8F5E9',
  'Cà phê': '#EFEBE9',
  'Ăn trưa': '#FFF3E0',
  'Mỹ phẩm': '#FCE4EC',
  'Khác': '#F5F5F5',
};

// Map category to an icon stroke color
export const CATEGORY_ICON_COLOR: Record<string, string> = {
  'Ăn uống': '#E65100',
  'Đi chợ': '#2E7D32',
  'Di chuyển': '#1565C0',
  'Mua sắm': '#C2185B',
  'Sinh hoạt': '#7B1FA2',
  'Giải trí': '#283593',
  'Sức khỏe': '#00838F',
  'Học tập': '#F9A825',
  'Quà tặng': '#C62828',
  'Tiết kiệm': '#00695C',
  'Đầu tư': '#2E7D32',
  'Cà phê': '#4E342E',
  'Ăn trưa': '#E65100',
  'Mỹ phẩm': '#AD1457',
  'Khác': '#616161',
};

export const CATEGORIES = Object.keys(CATEGORY_SVG);

/**
 * Format date clearly: "13/03/2014"
 */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format date + time: "13/03/2014 09:30"
 */
export function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Format date + time (12h format): "02:15 CH - 12/03/2026"
 */
export function formatDateTime12h(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'CH' : 'SA';
  hours = hours % 12;
  hours = hours ? hours : 12; 
  const strHours = hours.toString().padStart(2, '0');
  return `${strHours}:${minutes} ${ampm} - ${day}/${month}/${year}`;
}

/**
 * Format time only: "09:30"
 */
export function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Format date to ISO date string for input[type=date]: "2014-03-13"
 */
export function toInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * ==========================================
 * 🌐 Dashboard API Routes
 * ==========================================
 */

import { Router, type Request, type Response } from 'express';
import { verifySession } from '../database/repositories/session.repo.js';
import { getUserById } from '../database/repositories/user.repo.js';
import { getTransactions, getTotalSpending, getSpendingByCategory, updateTransaction, deleteTransaction } from '../database/repositories/transaction.repo.js';
import { getActiveBudgets } from '../database/repositories/budget.repo.js';
import { getOrCreatePersona, updatePersona } from '../database/repositories/persona.repo.js';
import { getAllUsers } from '../database/repositories/user.repo.js';
import { createLinkCode } from '../database/repositories/link.repo.js';
import { getWeekStart, getMonthStart, getTodayStart } from '../utils/date.js';
import { getMediaAbsolutePath, getMimeType, mediaExists, saveMedia } from '../utils/media.js';
import { broadcastText, broadcastImage, broadcastAIPersonalized } from '../services/broadcast.js';
import { processPDF } from '../services/pdf.js';
import config from '../config/index.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();

function isAdminUser(user: Awaited<ReturnType<typeof getUserById>>): boolean {
  if (!user) return false;

  return (
    config.adminUserIds.includes(user.id) ||
    (user.telegramId ? config.adminExternalIds.includes(String(user.telegramId)) : false) ||
    (user.zaloUserId ? config.adminExternalIds.includes(user.zaloUserId) : false) ||
    (user.zaloChatId ? config.adminExternalIds.includes(user.zaloChatId) : false)
  );
}

// --- GET /api/media/:subdir/:filename ---
// NOTE: This route is BEFORE auth middleware so browsers can load images directly
// Files use unique random filenames which provides security through obscurity
router.get('/media/:subdir/:filename', (req: Request, res: Response) => {
  const relativePath = `${req.params.subdir}/${req.params.filename}`;

  if (!mediaExists(relativePath)) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  const absPath = getMediaAbsolutePath(relativePath);
  const mimeType = getMimeType(req.params.filename as string);

  res.setHeader('Content-Type', mimeType);
  res.setHeader('Cache-Control', 'public, max-age=31536000');
  res.sendFile(absPath);
});

// --- Auth middleware ---
async function authMiddleware(req: Request, res: Response, next: () => void): Promise<void> {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token as string;

  if (!token) {
    res.status(401).json({ error: 'Token required' });
    return;
  }

  const userId = await verifySession(token);
  if (!userId) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  (req as any).userId = userId;
  next();
}

// Apply auth to all subsequent routes
router.use(authMiddleware);

// --- GET /api/auth/verify ---
router.get('/auth/verify', async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  const user = await getUserById(userId);

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const persona = await getOrCreatePersona(userId);

  res.json({
    user: {
      id: user.id,
      telegramId: user.telegramId,
      zaloUserId: user.zaloUserId,
      zaloChatId: user.zaloChatId,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
    },
    persona: {
      preset: persona.preset,
      displayName: persona.displayName,
    },
  });
});

// --- GET /api/dashboard/summary ---
router.get('/dashboard/summary', async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  const fromParam = req.query.from as string | undefined;
  const toParam = req.query.to as string | undefined;

  const todayStart = getTodayStart();
  const weekStart = getWeekStart();
  const monthStart = getMonthStart();

  const [todayTotal, weekTotal, monthTotal] = await Promise.all([
    getTotalSpending(userId, todayStart),
    getTotalSpending(userId, weekStart),
    getTotalSpending(userId, monthStart),
  ]);

  // Calculate prev week bounds
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const prevWeekTotal = await getTotalSpending(userId, prevWeekStart, new Date(weekStart.getTime() - 1));

  // Calculate prev month bounds
  const prevMonthStart = new Date(monthStart);
  prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);
  const prevMonthTotal = await getTotalSpending(userId, prevMonthStart, new Date(monthStart.getTime() - 1));

  const budgets = await getActiveBudgets(userId);

  // Use from/to params for filtering recent transactions if provided
  let recentFromDate: Date | undefined;
  let recentToDate: Date | undefined;
  if (fromParam) {
    recentFromDate = new Date(fromParam + 'T00:00:00');
  }
  if (toParam) {
    recentToDate = new Date(toParam + 'T23:59:59');
  }

  let recentTxs = await getTransactions(userId, recentFromDate, 50);

  // Filter by toDate if provided
  if (recentToDate) {
    recentTxs = recentTxs.filter(tx => new Date(tx.transactionDate) <= recentToDate!);
  }

  const monthCategories = await getSpendingByCategory(userId, monthStart);

  // Get budget spent amounts
  const budgetData = await Promise.all(
    budgets.map(async (b) => ({
      period: b.period,
      amount: b.amount,
      spent: await getTotalSpending(userId, b.period === 'week' ? weekStart : monthStart),
    }))
  );

  res.json({
    today: todayTotal,
    week: weekTotal,
    prevWeek: prevWeekTotal,
    month: monthTotal,
    prevMonth: prevMonthTotal,
    budgets: budgetData,
    categories: monthCategories,
    recent: recentTxs.map(tx => ({
      id: tx.id,
      amount: tx.amount,
      description: tx.description,
      category: tx.category,
      source: tx.source,
      date: tx.transactionDate,
      createdAt: tx.createdAt,
      mediaPath: tx.mediaPath || '',
    })),
  });
});

// --- GET /api/transactions ---
router.get('/transactions', async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  const period = (req.query.period as string) || 'month';
  const category = (req.query.category as string) || '';
  const limit = Math.min(parseInt((req.query.limit as string) || '100'), 200);

  let fromDate: Date | undefined;
  switch (period) {
    case 'today': fromDate = getTodayStart(); break;
    case 'week': fromDate = getWeekStart(); break;
    case 'month': fromDate = getMonthStart(); break;
    case 'all': fromDate = undefined; break;
    default: fromDate = getMonthStart();
  }

  let txs = await getTransactions(userId, fromDate, limit);

  // Filter by category if specified
  if (category) {
    txs = txs.filter(tx => tx.category === category);
  }

  const total = txs.reduce((sum, tx) => sum + tx.amount, 0);

  res.json({
    transactions: txs.map(tx => ({
      id: tx.id,
      amount: tx.amount,
      description: tx.description,
      category: tx.category,
      source: tx.source,
      date: tx.transactionDate,
      createdAt: tx.createdAt,
      mediaPath: tx.mediaPath || '',
    })),
    total,
    count: txs.length,
  });
});

// --- PUT /api/transactions/:id ---
router.put('/transactions/:id', async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  const id = parseInt(req.params.id as string);
  const { amount, description, category } = req.body;

  const updated = await updateTransaction(id, userId, {
    ...(amount !== undefined && { amount }),
    ...(description !== undefined && { description }),
    ...(category !== undefined && { category }),
  });

  if (!updated) {
    res.status(404).json({ error: 'Transaction not found' });
    return;
  }

  res.json({ success: true, transaction: updated });
});

// --- DELETE /api/transactions/:id ---
router.delete('/transactions/:id', async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  const id = parseInt(req.params.id as string);

  const deleted = await deleteTransaction(id, userId);
  if (!deleted) {
    res.status(404).json({ error: 'Transaction not found' });
    return;
  }

  res.json({ success: true });
});

// --- GET /api/persona ---
router.get('/persona', async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  const persona = await getOrCreatePersona(userId);
  res.json(persona);
});

// --- PUT /api/persona ---
router.put('/persona', async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  const { sarcasmLevel, seriousnessLevel, frugalityLevel, emojiLevel } = req.body;

  const updated = await updatePersona(userId, {
    ...(sarcasmLevel !== undefined && { sarcasmLevel }),
    ...(seriousnessLevel !== undefined && { seriousnessLevel }),
    ...(frugalityLevel !== undefined && { frugalityLevel }),
    ...(emojiLevel !== undefined && { emojiLevel }),
  });

  res.json({ success: true, persona: updated });
});

// --- POST /api/link/zalo-code ---
router.post('/link/zalo-code', async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  const code = await createLinkCode(userId, 'zalo');

  res.json({
    success: true,
    code: code?.code,
    expiresAt: code?.expiresAt,
  });
});

// --- POST /api/import/pdf ---
router.post('/import/pdf', upload.single('file'), async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  const file = req.file;

  if (!file) {
    res.status(400).json({ error: 'PDF file is required' });
    return;
  }

  if (!file.mimetype.includes('pdf')) {
    res.status(400).json({ error: 'Only PDF files are supported' });
    return;
  }

  const mediaPath = saveMedia(file.buffer, userId, 'pdf', 'pdf');
  const result = await processPDF(file.buffer, userId, mediaPath);

  res.json({
    success: result.success,
    message: result.message,
    totalAmount: result.totalAmount,
    mediaPath,
  });
});

// --- GET /api/stats ---
router.get('/stats', async (req: Request, res: Response) => {
  const userId = (req as any).userId as number;
  const period = (req.query.period as string) || '';
  const category = (req.query.category as string) || '';
  const fromParam = req.query.from as string | undefined;
  const toParam = req.query.to as string | undefined;

  let fromDate: Date;
  if (fromParam) {
    // Custom date range
    fromDate = new Date(fromParam + 'T00:00:00');
  } else {
    switch (period) {
      case 'today': fromDate = getTodayStart(); break;
      case 'week': fromDate = getWeekStart(); break;
      case 'all': fromDate = new Date(0); break;
      default: fromDate = getMonthStart();
    }
  }

  let toDate: Date | undefined;
  if (toParam) {
    toDate = new Date(toParam + 'T23:59:59');
  }

  const total = await getTotalSpending(userId, fromDate);
  let categories = await getSpendingByCategory(userId, fromDate);

  let txs = await getTransactions(userId, fromDate, 200);

  // Filter by toDate if provided
  if (toDate) {
    txs = txs.filter(tx => new Date(tx.transactionDate) <= toDate!);
  }

  if (category) {
    txs = txs.filter(tx => tx.category === category);
    categories = categories.filter(c => c.category === category);
  }

  const budgets = await getActiveBudgets(userId);

  res.json({
    total: category ? txs.reduce((s, t) => s + t.amount, 0) : total,
    categories,
    budgets: budgets.map(b => ({
      period: b.period,
      amount: b.amount,
    })),
    transactions: txs.map(tx => ({
      id: tx.id,
      amount: tx.amount,
      description: tx.description,
      category: tx.category,
      source: tx.source,
      date: tx.transactionDate,
      mediaPath: tx.mediaPath || '',
    })),
    count: txs.length,
  });
});

// ======================================
// ADMIN ROUTES
// ======================================

// Admin auth middleware
async function adminMiddleware(req: Request, res: Response, next: () => void): Promise<void> {
  const userId = (req as any).userId as number;
  const user = await getUserById(userId);

  if (!isAdminUser(user)) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
}

// --- GET /api/admin/users ---
router.get('/admin/users', adminMiddleware, async (req: Request, res: Response) => {
  const users = await getAllUsers();
  res.json({
    users: users.map(u => ({
      id: u.id,
      telegramId: u.telegramId,
      zaloUserId: u.zaloUserId,
      zaloChatId: u.zaloChatId,
      firstName: u.firstName,
      lastName: u.lastName,
      username: u.username,
      createdAt: u.createdAt,
    })),
    total: users.length,
  });
});

// --- POST /api/admin/broadcast ---
router.post('/admin/broadcast', adminMiddleware, async (req: Request, res: Response) => {
  const { message, userIds, parseMode } = req.body;

  if (!message) {
    res.status(400).json({ error: 'Message is required' });
    return;
  }

  const result = await broadcastText(
    message,
    userIds && userIds.length > 0 ? userIds : undefined,
    parseMode || 'Markdown',
  );

  res.json(result);
});

// --- POST /api/admin/broadcast-image ---
router.post('/admin/broadcast-image', adminMiddleware, upload.single('image'), async (req: Request, res: Response) => {
  const caption = req.body.caption || '';
  const userIds = req.body.userIds ? JSON.parse(req.body.userIds) : undefined;
  const parseMode = req.body.parseMode || 'Markdown';

  let imageSource: string | Buffer;
  let filename: string | undefined;

  if (req.file) {
    // Uploaded file
    imageSource = req.file.buffer;
    filename = req.file.originalname;
  } else if (req.body.imageUrl) {
    // URL
    imageSource = req.body.imageUrl;
  } else {
    res.status(400).json({ error: 'Image file or imageUrl is required' });
    return;
  }

  const result = await broadcastImage(
    imageSource,
    caption || undefined,
    userIds && userIds.length > 0 ? userIds : undefined,
    parseMode,
    filename,
  );

  res.json(result);
});

// --- POST /api/admin/broadcast-ai ---
router.post('/admin/broadcast-ai', adminMiddleware, async (req: Request, res: Response) => {
  const { message, userIds } = req.body;

  if (!message) {
    res.status(400).json({ error: 'Message is required' });
    return;
  }

  const result = await broadcastAIPersonalized(
    message,
    userIds && userIds.length > 0 ? userIds : undefined,
  );

  res.json(result);
});

// --- GET /api/admin/check ---
router.get('/admin/check', adminMiddleware, async (_req: Request, res: Response) => {
  res.json({ isAdmin: true });
});

export default router;

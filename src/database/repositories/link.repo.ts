/**
 * ==========================================
 * 🔗 Account Link Code Repository
 * ==========================================
 */

import { and, eq, gt, isNull } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../connection.js';
import { accountLinkCodes } from '../schema.js';

const LINK_CODE_TTL_MINUTES = 15;

export async function getActiveLinkCodeForUser(userId: number, platform = 'zalo') {
  const [record] = await db
    .select()
    .from(accountLinkCodes)
    .where(
      and(
        eq(accountLinkCodes.userId, userId),
        eq(accountLinkCodes.platform, platform),
        gt(accountLinkCodes.expiresAt, new Date()),
        isNull(accountLinkCodes.usedAt),
      ),
    )
    .limit(1);

  return record ?? null;
}

export async function createLinkCode(userId: number, platform = 'zalo') {
  const existing = await getActiveLinkCodeForUser(userId, platform);
  if (existing) {
    return existing;
  }

  const code = nanoid(8).toUpperCase();
  const expiresAt = new Date(Date.now() + LINK_CODE_TTL_MINUTES * 60 * 1000);

  await db.insert(accountLinkCodes).values({
    userId,
    platform,
    code,
    expiresAt,
  });

  const [created] = await db
    .select()
    .from(accountLinkCodes)
    .where(eq(accountLinkCodes.code, code))
    .limit(1);

  return created ?? null;
}

export async function consumeLinkCode(code: string, platform = 'zalo') {
  const normalized = code.trim().toUpperCase();

  const [record] = await db
    .select()
    .from(accountLinkCodes)
    .where(
      and(
        eq(accountLinkCodes.code, normalized),
        eq(accountLinkCodes.platform, platform),
        gt(accountLinkCodes.expiresAt, new Date()),
        isNull(accountLinkCodes.usedAt),
      ),
    )
    .limit(1);

  if (!record) {
    return null;
  }

  await markLinkCodeUsed(record.id);
  return record;
}

export async function getConsumableLinkCode(code: string, platform = 'zalo') {
  const normalized = code.trim().toUpperCase();

  const [record] = await db
    .select()
    .from(accountLinkCodes)
    .where(
      and(
        eq(accountLinkCodes.code, normalized),
        eq(accountLinkCodes.platform, platform),
        gt(accountLinkCodes.expiresAt, new Date()),
        isNull(accountLinkCodes.usedAt),
      ),
    )
    .limit(1);

  return record ?? null;
}

export async function markLinkCodeUsed(id: number) {
  await db
    .update(accountLinkCodes)
    .set({ usedAt: new Date() })
    .where(eq(accountLinkCodes.id, id));
}

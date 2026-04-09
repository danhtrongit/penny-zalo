/**
 * ==========================================
 * 🔐 Session Repository
 * ==========================================
 * Manages temporary dashboard access tokens.
 */

import { eq, and, sql } from 'drizzle-orm';
import { db } from '../connection.js';
import { dashboardSessions } from '../schema.js';
import { nanoid } from 'nanoid';

const SESSION_TTL_MINUTES = 60;

/**
 * Create a new dashboard session
 */
export async function createSession(userId: number): Promise<{ token: string; expiresAt: string }> {
  const token = nanoid(32);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MINUTES * 60 * 1000);

  await db.insert(dashboardSessions)
    .values({
      userId,
      token,
      expiresAt: sql`DATE_ADD(NOW(), INTERVAL ${SESSION_TTL_MINUTES} MINUTE)` as unknown as Date,
    });

  return { token, expiresAt: expiresAt.toISOString() };
}

/**
 * Verify a session token, returns userId or null
 */
export async function verifySession(token: string): Promise<number | null> {
  const [session] = await db
    .select()
    .from(dashboardSessions)
    .where(
      and(
        eq(dashboardSessions.token, token),
        sql`${dashboardSessions.expiresAt} > NOW()`
      )
    )
    .limit(1);

  return session?.userId ?? null;
}

/**
 * Cleanup expired sessions
 */
export async function cleanupSessions(): Promise<void> {
  await db.delete(dashboardSessions)
    .where(sql`${dashboardSessions.expiresAt} < NOW()`);
}

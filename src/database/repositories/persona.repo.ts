/**
 * ==========================================
 * 🎭 Persona Repository
 * ==========================================
 */

import { eq } from 'drizzle-orm';
import { db } from '../connection.js';
import { personaSettings } from '../schema.js';

export interface PersonaData {
  preset?: string;
  sarcasmLevel?: number;
  seriousnessLevel?: number;
  frugalityLevel?: number;
  emojiLevel?: number;
  displayName?: string;
  age?: number | null;
  gender?: string;
}

/**
 * Get or create persona settings for a user
 */
export async function getOrCreatePersona(userId: number) {
  const [existing] = await db
    .select()
    .from(personaSettings)
    .where(eq(personaSettings.userId, userId))
    .limit(1);

  if (existing) return existing;

  await db
    .insert(personaSettings)
    .values({ userId });

  const [created] = await db
    .select()
    .from(personaSettings)
    .where(eq(personaSettings.userId, userId))
    .limit(1);

  return created!;
}

/**
 * Update persona settings
 */
export async function updatePersona(userId: number, data: PersonaData) {
  // Ensure persona exists
  await getOrCreatePersona(userId);

  await db
    .update(personaSettings)
    .set(data)
    .where(eq(personaSettings.userId, userId));

  const [updated] = await db
    .select()
    .from(personaSettings)
    .where(eq(personaSettings.userId, userId))
    .limit(1);

  return updated!;
}

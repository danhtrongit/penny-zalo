import { createHash } from 'node:crypto';
import * as txRepo from '../database/repositories/transaction.repo.js';

export const mediaImportRepo = {
  getTransactionsByMediaHash: txRepo.getTransactionsByMediaHash,
};

export function computeMediaHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export async function detectImportedMediaDuplicate(userId: number, buffer: Buffer) {
  const mediaHash = computeMediaHash(buffer);
  const [existing] = await mediaImportRepo.getTransactionsByMediaHash(userId, mediaHash, 1);

  return {
    mediaHash,
    existing: existing ?? null,
  };
}

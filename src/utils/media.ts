/**
 * ==========================================
 * 📁 Media Storage — Save receipt files
 * ==========================================
 * Saves uploaded images/PDFs to disk for later retrieval.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MEDIA_DIR = path.resolve(__dirname, '../../data/media');

// Ensure the media directory exists
if (!fs.existsSync(MEDIA_DIR)) {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
  logger.info(`📁 Created media directory: ${MEDIA_DIR}`);
}

/**
 * Save a media file to disk.
 * @returns Relative path from data/media/ (e.g., "receipts/1234_abc.jpg")
 */
export function saveMedia(
  buffer: Buffer,
  userId: number,
  fileType: 'image' | 'pdf',
  extension: string = 'jpg',
): string {
  const subDir = fileType === 'pdf' ? 'pdfs' : 'receipts';
  const dirPath = path.join(MEDIA_DIR, subDir);

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  // Generate unique filename: userId_timestamp_random.ext
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const filename = `${userId}_${timestamp}_${random}.${extension}`;
  const filePath = path.join(dirPath, filename);

  fs.writeFileSync(filePath, buffer);
  logger.info(`📁 Saved media: ${subDir}/${filename} (${(buffer.length / 1024).toFixed(1)}KB)`);

  // Return relative path (from data/media/)
  return `${subDir}/${filename}`;
}

/**
 * Get absolute path for a media file.
 */
export function getMediaAbsolutePath(relativePath: string): string {
  return path.join(MEDIA_DIR, relativePath);
}

/**
 * Check if a media file exists.
 */
export function mediaExists(relativePath: string): boolean {
  return fs.existsSync(getMediaAbsolutePath(relativePath));
}

/**
 * Get the MIME type from a filename.
 */
export function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'pdf':
      return 'application/pdf';
    case 'webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

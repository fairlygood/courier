import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export const THUMBNAIL_STORE_DIR = path.join(__dirname, '..', '..', 'data', 'thumbnails');

fs.mkdirSync(THUMBNAIL_STORE_DIR, { recursive: true });

export function hashBuffer(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

export function saveFile(buf: Buffer): string {
  const hash = hashBuffer(buf);
  const dest = path.join(THUMBNAIL_STORE_DIR, hash);

  if (!fs.existsSync(dest)) {
    fs.writeFileSync(dest, buf);
  }

  return hash;
}

export function getThumbnailPath(hash: string): string {
  return path.join(THUMBNAIL_STORE_DIR, hash);
}

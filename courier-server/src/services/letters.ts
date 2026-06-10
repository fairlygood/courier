import { v4 as uuidv4 } from 'uuid';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import db from '../db';
import { saveFile, getThumbnailPath } from '../storage/fileStore';
import { computeDeliveryDelay } from './geo';
import type { LetterRow, LetterSummary, SentLetter } from '../types';

interface LetterWithAuthor extends LetterRow {
  author_username?: string;
  author_name?: string;
  author_country?: string;
  recipient_username?: string;
  recipient_name?: string;
}

export function createLetter(
  userId: string,
  files: Express.Multer.File[],
  description: string,
  recipientId: string | null,
  isPublic: boolean,
): { id: string; createdAt: string; deliverAt: string } {
  const pageHashes: string[] = [];
  for (const file of files) {
    const buf = fs.readFileSync(file.path);
    const hash = saveFile(buf);
    pageHashes.push(hash);
    fs.unlinkSync(file.path);
  }

  const id = uuidv4();
  const now = new Date().toISOString();
  const isPub = recipientId ? 0 : (isPublic ? 1 : 0);

  // Compute delivery delay based on sender → recipient distance
  let deliverAt = now; // public letters: instant
  if (recipientId) {
    const senderRow = db.prepare('SELECT country FROM users WHERE id = ?').get(userId) as { country: string } | undefined;
    const recipientRow = db.prepare('SELECT country FROM users WHERE id = ?').get(recipientId) as { country: string } | undefined;
    const senderCountry = senderRow?.country || '';
    const recipientCountry = recipientRow?.country || '';
    const delayHours = computeDeliveryDelay(senderCountry, recipientCountry);
    deliverAt = new Date(Date.now() + delayHours * 60 * 60 * 1000).toISOString();
  }

  db.prepare(
    'INSERT INTO letters (id, author_id, description, page_hashes, is_public, recipient_id, created_at, deliver_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(id, userId, description.trim().slice(0, 500), JSON.stringify(pageHashes), isPub, recipientId, now, deliverAt);

  return { id, createdAt: now, deliverAt };
}

export function getInbox(userId: string): LetterSummary[] {
  const letters = db.prepare(`
    SELECT l.id, l.description, l.page_hashes, l.created_at, l.deliver_at, l.is_read,
           u.id as author_id, u.username as author_username, u.display_name as author_name, u.country as author_country
    FROM letters l
    JOIN users u ON l.author_id = u.id
    WHERE l.recipient_id = ?
    ORDER BY l.created_at DESC
    LIMIT 50
  `).all(userId) as LetterWithAuthor[];

  return letters.map(formatLetter);
}

export function getFeed(): LetterSummary[] {
  const now = new Date().toISOString();
  const letters = db.prepare(`
    SELECT l.id, l.description, l.page_hashes, l.created_at, l.deliver_at,
           u.id as author_id, u.username as author_username, u.display_name as author_name, u.country as author_country
    FROM letters l
    JOIN users u ON l.author_id = u.id
    WHERE l.is_public = 1
      AND l.deliver_at <= ?
    ORDER BY l.created_at DESC
    LIMIT 50
  `).all(now) as LetterWithAuthor[];

  return letters.map(formatLetter);
}

export function getSent(userId: string): SentLetter[] {
  const letters = db.prepare(`
    SELECT l.id, l.description, l.page_hashes, l.created_at, l.deliver_at, l.is_public,
           r.username as recipient_username, r.display_name as recipient_name
    FROM letters l
    LEFT JOIN users r ON l.recipient_id = r.id
    WHERE l.author_id = ?
    ORDER BY l.created_at DESC
    LIMIT 50
  `).all(userId) as LetterWithAuthor[];

  return letters.map((l) => ({
    id: l.id,
    description: l.description,
    pageCount: JSON.parse(l.page_hashes).length,
    isPublic: !!l.is_public,
    recipientUsername: l.recipient_username || null,
    recipientName: l.recipient_name || null,
    createdAt: l.created_at,
    deliverAt: l.deliver_at,
  }));
}

export function getLetterById(id: string): LetterSummary | null {
  const letter = db.prepare(`
    SELECT l.*, u.username as author_username, u.display_name as author_name, u.country as author_country
    FROM letters l
    JOIN users u ON l.author_id = u.id
    WHERE l.id = ?
  `).get(id) as LetterWithAuthor | undefined;

  if (!letter) return null;
  return formatLetter(letter);
}

export function getLetterPageHashes(id: string): string[] | null {
  const letter = db.prepare('SELECT page_hashes FROM letters WHERE id = ?').get(id) as LetterRow | undefined;
  if (!letter) return null;
  return JSON.parse(letter.page_hashes);
}

export function getLetterAuthorId(id: string): string | null {
  const letter = db.prepare('SELECT author_id FROM letters WHERE id = ?').get(id) as LetterRow | undefined;
  if (!letter) return null;
  return letter.author_id;
}

/**
 * Mark a letter as read by its recipient.
 * Only sets is_read if the given user is actually the recipient.
 */
export function markLetterAsRead(letterId: string, userId: string): void {
  db.prepare(
    'UPDATE letters SET is_read = 1 WHERE id = ? AND recipient_id = ?',
  ).run(letterId, userId);
}

/**
 * Check whether a user is authorized to read a letter.
 * Allowed if the user is the author, the recipient, or the letter is public.
 * Returns false if the letter does not exist (don't leak existence info).
 */
export function canUserAccessLetter(userId: string, letterId: string): boolean {
  const row = db.prepare(
    'SELECT author_id, recipient_id, is_public FROM letters WHERE id = ?',
  ).get(letterId) as { author_id: string; recipient_id: string | null; is_public: number } | undefined;

  if (!row) return false;
  if (row.is_public) return true;
  if (row.author_id === userId) return true;
  if (row.recipient_id === userId) return true;
  return false;
}

export function getAllLetters(): LetterSummary[] {
  const letters = db.prepare(`
    SELECT l.id, l.description, l.page_hashes, l.created_at, l.deliver_at, l.is_public,
           u.id as author_id, u.username as author_username, u.display_name as author_name,
           r.username as recipient_username, r.display_name as recipient_name
    FROM letters l
    JOIN users u ON l.author_id = u.id
    LEFT JOIN users r ON l.recipient_id = r.id
    ORDER BY l.created_at DESC
    LIMIT 100
  `).all() as LetterWithAuthor[];

  return letters.map(formatLetter);
}

export function deleteLetter(id: string): void {
  db.prepare('DELETE FROM letters WHERE id = ?').run(id);
}

export function getUserById(id: string): { id: string } | undefined {
  return db.prepare('SELECT id FROM users WHERE id = ?').get(id) as { id: string } | undefined;
}

export function resolveRecipient(username: string): string | null {
  const recipient = db.prepare('SELECT id FROM users WHERE username = ?').get(
    username.trim().toLowerCase(),
  ) as { id: string } | undefined;
  return recipient?.id || null;
}

export interface CoverMetadata {
  authorName: string;
  authorUsername: string;
  createdAt: string;
}

function addCoverPage(doc: PDFKit.PDFDocument, meta: CoverMetadata, width: number, height: number): void {
  doc.addPage({ size: [width, height] });

  // Courier logo — large centered title in MomoSignature
  doc.font('MomoSignature').fontSize(120);
  doc.text('Courier', 0, height * 0.22, {
    width,
    align: 'center',
  });

  // Divider line
  const lineY = height * 0.34;
  doc.moveTo(width * 0.2, lineY).lineTo(width * 0.8, lineY).lineWidth(2).stroke('#cccccc');

  // Metadata
  const textY = height * 0.40;
  doc.font('Helvetica').fontSize(36);
  doc.text('This letter was written by', 0, textY, { width, align: 'center' });

  doc.font('MomoSignature').fontSize(56);
  doc.text(meta.authorName || meta.authorUsername, 0, textY + 90, { width, align: 'center' });

  doc.font('Helvetica').fontSize(30).fillColor('#666666');
  doc.text(`(${meta.authorUsername})`, 0, textY + 175, { width, align: 'center' });

  const date = new Date(meta.createdAt);
  const formatted = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.fillColor('#555555').fontSize(32);
  doc.text(`on ${formatted}`, 0, textY + 260, { width, align: 'center' });
}

const MOMOSIGNATURE_PATH = path.join(__dirname, '..', '..', 'assets', 'fonts', 'MomoSignature-Regular.ttf');

export async function generatePdf(pageHashes: string[], coverMeta?: CoverMetadata): Promise<Buffer> {
  const doc = new PDFDocument({ autoFirstPage: false });
  doc.registerFont('MomoSignature', MOMOSIGNATURE_PATH);
  const buffers: Buffer[] = [];

  return new Promise((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => buffers.push(chunk));
    doc.on('end', () => {
      resolve(Buffer.concat(buffers));
    });
    doc.on('error', reject);

    (async () => {
      try {
        // Determine page dimensions from the first page (or use defaults)
        let pageWidth = 1404;
        let pageHeight = 1872;
        if (pageHashes.length > 0) {
          try {
            const meta = await sharp(getThumbnailPath(pageHashes[0])).metadata();
            if (meta?.width && meta?.height) {
              pageWidth = meta.width;
              pageHeight = meta.height;
            }
          } catch {}
        }

        for (const hash of pageHashes) {
          const pngPath = getThumbnailPath(hash);
          let metadata;
          try {
            metadata = await sharp(pngPath).metadata();
          } catch {
            metadata = null;
          }
          doc.addPage({
            size: [metadata?.width || pageWidth, metadata?.height || pageHeight],
          });
          doc.image(pngPath, 0, 0, {
            width: metadata?.width || pageWidth,
            height: metadata?.height || pageHeight,
          });
        }

        // Colophon — last page
        if (coverMeta) {
          addCoverPage(doc, coverMeta, pageWidth, pageHeight);
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    })();
  });
}

function formatLetter(l: LetterWithAuthor): LetterSummary {
  const hashes = JSON.parse(l.page_hashes);
  return {
    id: l.id,
    description: l.description,
    pageCount: hashes.length,
    thumbnailUrl: hashes.length > 0 ? `/letters/${l.id}/page/0` : null,
    authorId: l.author_id,
    authorUsername: l.author_username!,
    authorName: l.author_name!,
    authorCountry: l.author_country || '',
    createdAt: l.created_at,
    deliverAt: l.deliver_at,
    isRead: !!l.is_read,
  };
}

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';

// ── Hoisted container so mock factory can capture the db ref ──────────

const ctx = vi.hoisted(() => {
  const Database = require('better-sqlite3');
  const db: ReturnType<typeof Database> = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return { db };
});

// ── Mocks ─────────────────────────────────────────────────────────────

vi.mock('../../db', () => ({ default: ctx.db }));

vi.mock('../../storage/fileStore', () => ({
  saveFile: vi.fn(() => 'abc123hash'),
  getThumbnailPath: vi.fn((hash: string) => `/tmp/test/${hash}.png`),
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-letter-id'),
}));

// fs is imported as `import fs from 'fs'` — must mock default export
vi.mock('fs', () => ({
  default: {
    readFileSync: vi.fn(() => Buffer.from('fake-png-data')),
    unlinkSync: vi.fn(() => {}),
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(() => {}),
  },
}));

// ── Import under test (after mocks) ────────────────────────────────────

import * as lettersService from '../letters';

// ── Schema setup ──────────────────────────────────────────────────────

const NOW = new Date().toISOString();

beforeAll(() => {
  ctx.db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT DEFAULT '',
      bio TEXT DEFAULT '',
      country TEXT DEFAULT '',
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS letters (
      id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL REFERENCES users(id),
      description TEXT DEFAULT '',
      page_hashes TEXT NOT NULL,
      is_public INTEGER NOT NULL DEFAULT 0,
      recipient_id TEXT REFERENCES users(id),
      created_at TEXT NOT NULL,
      deliver_at TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0
    );
  `);

  ctx.db.prepare(
    'INSERT OR IGNORE INTO users (id, username, display_name, country, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run('user-gb', 'sender-uk', 'UK Sender', 'GB', '$hash', NOW);
  ctx.db.prepare(
    'INSERT OR IGNORE INTO users (id, username, display_name, country, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run('user-us', 'recipient-us', 'US Recipient', 'US', '$hash', NOW);
});

beforeEach(() => {
  ctx.db.prepare('DELETE FROM letters').run();
});

// ── Helpers ──────────────────────────────────────────────────────────

function fakeFile(): Express.Multer.File {
  return {
    fieldname: 'pages',
    originalname: 'page_0.png',
    encoding: '7bit',
    mimetype: 'image/png',
    destination: '/tmp',
    filename: 'abc123',
    path: '/tmp/abc123',
    size: 1000,
    stream: null as any,
    buffer: null as any,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('createLetter', () => {
  it('public letter → deliverAt equals createdAt (instant)', () => {
    const result = lettersService.createLetter(
      'user-gb',
      [fakeFile()],
      'A public note',
      null,
      true,
    );

    expect(result.id).toBe('test-letter-id');
    expect(result.deliverAt).toBe(result.createdAt);

    const row = ctx.db.prepare('SELECT * FROM letters WHERE id = ?').get('test-letter-id') as any;
    expect(row.is_public).toBe(1);
    expect(row.recipient_id).toBeNull();
    expect(row.deliver_at).toBe(row.created_at);
  });

  it('direct letter → deliverAt is in the future (GB → US ≈ 29 hours)', () => {
    const result = lettersService.createLetter(
      'user-gb',
      [fakeFile()],
      'A direct letter',
      'user-us',
      false,
    );

    expect(result.id).toBe('test-letter-id');
    expect(result.deliverAt).not.toBe(result.createdAt);

    const createdTime = new Date(result.createdAt).getTime();
    const deliverTime = new Date(result.deliverAt).getTime();
    const diffHours = (deliverTime - createdTime) / (1000 * 60 * 60);

    expect(diffHours).toBeGreaterThanOrEqual(1);
    expect(diffHours).toBeLessThanOrEqual(48);

    const row = ctx.db.prepare('SELECT * FROM letters WHERE id = ?').get('test-letter-id') as any;
    expect(row.is_public).toBe(0);
    expect(row.recipient_id).toBe('user-us');
  });

  it('direct letter → deliverAt > createdAt', () => {
    const result = lettersService.createLetter(
      'user-gb',
      [fakeFile()],
      'Another direct letter',
      'user-us',
      false,
    );

    const createdTime = new Date(result.createdAt).getTime();
    const deliverTime = new Date(result.deliverAt).getTime();
    expect(deliverTime).toBeGreaterThan(createdTime);
  });

  it('letter with multiple pages stores all hashes', () => {
    lettersService.createLetter(
      'user-gb',
      [fakeFile(), fakeFile(), fakeFile()],
      'Multi-page',
      null,
      true,
    );

    const row = ctx.db.prepare('SELECT page_hashes FROM letters WHERE id = ?').get('test-letter-id') as any;
    const hashes = JSON.parse(row.page_hashes);
    expect(hashes).toEqual(['abc123hash', 'abc123hash', 'abc123hash']);
  });
});

describe('getInbox', () => {
  it('returns letters regardless of deliver_at (in-transit included)', () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const pastDate = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();

    ctx.db.prepare(
      'INSERT INTO letters (id, author_id, description, page_hashes, is_public, recipient_id, created_at, deliver_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).run('future-letter', 'user-gb', 'In transit', '["h1"]', 0, 'user-us', pastDate, futureDate);

    ctx.db.prepare(
      'INSERT INTO letters (id, author_id, description, page_hashes, is_public, recipient_id, created_at, deliver_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).run('past-letter', 'user-gb', 'Delivered', '["h2"]', 0, 'user-us', pastDate, pastDate);

    const inbox = lettersService.getInbox('user-us');

    expect(inbox).toHaveLength(2);
    const ids = inbox.map((l) => l.id);
    expect(ids).toContain('future-letter');
    expect(ids).toContain('past-letter');

    for (const letter of inbox) {
      expect(letter.deliverAt).toBeTruthy();
    }
  });

  it('returns empty array when no letters for user', () => {
    const inbox = lettersService.getInbox('user-gb');
    expect(inbox).toEqual([]);
  });
});

describe('getFeed', () => {
  it('excludes letters with future deliver_at', () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const pastDate = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();

    ctx.db.prepare(
      'INSERT INTO letters (id, author_id, description, page_hashes, is_public, recipient_id, created_at, deliver_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).run('future-public', 'user-gb', 'Not yet', '["h1"]', 1, null, pastDate, futureDate);

    ctx.db.prepare(
      'INSERT INTO letters (id, author_id, description, page_hashes, is_public, recipient_id, created_at, deliver_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).run('past-public', 'user-us', 'Visible', '["h2"]', 1, null, pastDate, pastDate);

    const feed = lettersService.getFeed();

    expect(feed).toHaveLength(1);
    expect(feed[0].id).toBe('past-public');
    expect(feed[0].deliverAt).toBe(pastDate);
  });

  it('excludes non-public letters from feed', () => {
    const pastDate = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();

    ctx.db.prepare(
      'INSERT INTO letters (id, author_id, description, page_hashes, is_public, recipient_id, created_at, deliver_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).run('direct-letter', 'user-gb', 'Private', '["h1"]', 0, 'user-us', pastDate, pastDate);

    const feed = lettersService.getFeed();
    expect(feed.find((l) => l.id === 'direct-letter')).toBeUndefined();
  });
});

describe('getSent', () => {
  it('includes deliverAt in sent letters', () => {
    const pastDate = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();

    ctx.db.prepare(
      'INSERT INTO letters (id, author_id, description, page_hashes, is_public, recipient_id, created_at, deliver_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).run('sent-1', 'user-gb', 'My letter', '["h1"]', 0, 'user-us', pastDate, pastDate);

    const sent = lettersService.getSent('user-gb');

    expect(sent).toHaveLength(1);
    expect(sent[0].id).toBe('sent-1');
    expect(sent[0].deliverAt).toBe(pastDate);
    expect(sent[0].recipientUsername).toBe('recipient-us');
  });
});

describe('getLetterById', () => {
  it('includes deliverAt in result', () => {
    const pastDate = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    ctx.db.prepare(
      'INSERT INTO letters (id, author_id, description, page_hashes, is_public, recipient_id, created_at, deliver_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).run('letter-1', 'user-gb', 'Test', '["h1","h2"]', 0, 'user-us', pastDate, futureDate);

    const letter = lettersService.getLetterById('letter-1');

    expect(letter).not.toBeNull();
    expect(letter!.deliverAt).toBe(futureDate);
    expect(letter!.pageCount).toBe(2);
    expect(letter!.authorUsername).toBe('sender-uk');
    expect(letter!.authorCountry).toBe('GB');
  });
});

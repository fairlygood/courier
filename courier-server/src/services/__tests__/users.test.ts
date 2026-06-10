import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';

// ── Hoisted in-memory DB ──────────────────────────────────────────────

const ctx = vi.hoisted(() => {
  const Database = require('better-sqlite3');
  const db: ReturnType<typeof Database> = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return { db };
});

// ── Mock ──────────────────────────────────────────────────────────────

vi.mock('../../db', () => ({ default: ctx.db }));

// ── Import under test ─────────────────────────────────────────────────

import * as usersService from '../users';

// ── Schema + seed ─────────────────────────────────────────────────────

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
      deliver_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
});

beforeEach(() => {
  ctx.db.prepare('DELETE FROM letters').run();
  ctx.db.prepare('DELETE FROM refresh_tokens').run();
  ctx.db.prepare('DELETE FROM users').run();
});

function seedUser(id: string, username: string, name: string, bio: string) {
  ctx.db.prepare(
    'INSERT INTO users (id, username, display_name, bio, country, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).run(id, username, name, bio, 'US', '$hash', NOW);
}

function seedLetter(id: string, authorId: string) {
  ctx.db.prepare(
    'INSERT INTO letters (id, author_id, description, page_hashes, is_public, recipient_id, created_at, deliver_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(id, authorId, '', '["h1"]', 1, null, NOW, NOW);
}

function seedToken(id: string, userId: string) {
  ctx.db.prepare(
    'INSERT INTO refresh_tokens (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
  ).run(id, userId, NOW, NOW);
}

// ── getAllUsers ───────────────────────────────────────────────────────

describe('getAllUsers', () => {
  it('returns empty array when no users', () => {
    expect(usersService.getAllUsers()).toEqual([]);
  });

  it('returns all users with letter counts', () => {
    seedUser('u1', 'alice', 'Alice', 'Bio 1');
    seedUser('u2', 'bob', 'Bob', 'Bio 2');
    seedLetter('l1', 'u1');
    seedLetter('l2', 'u1');
    seedLetter('l3', 'u2');

    const users = usersService.getAllUsers();

    expect(users).toHaveLength(2);
    const alice = users.find((u) => u.id === 'u1')!;
    const bob = users.find((u) => u.id === 'u2')!;

    expect(alice.username).toBe('alice');
    expect(alice.displayName).toBe('Alice');
    expect(alice.bio).toBe('Bio 1');
    expect(alice.letterCount).toBe(2);

    expect(bob.username).toBe('bob');
    expect(bob.letterCount).toBe(1);
  });

  it('returns zero letterCount for user with no letters', () => {
    seedUser('u1', 'alice', 'Alice', '');
    const users = usersService.getAllUsers();
    expect(users[0].letterCount).toBe(0);
  });

  it('orders by created_at DESC', () => {
    const earlier = new Date(Date.now() - 10000).toISOString();
    const later = new Date(Date.now()).toISOString();

    ctx.db.prepare(
      'INSERT INTO users (id, username, display_name, bio, country, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run('old', 'old-user', '', '', '', '$hash', earlier);
    ctx.db.prepare(
      'INSERT INTO users (id, username, display_name, bio, country, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run('new', 'new-user', '', '', '', '$hash', later);

    const users = usersService.getAllUsers();
    expect(users[0].id).toBe('new');
    expect(users[1].id).toBe('old');
  });
});

// ── getUserById ───────────────────────────────────────────────────────

describe('getUserById', () => {
  it('returns user with letter count', () => {
    seedUser('u1', 'alice', 'Alice', 'Bio');
    seedLetter('l1', 'u1');
    seedLetter('l2', 'u1');

    const user = usersService.getUserById('u1');
    expect(user).not.toBeNull();
    expect(user!.id).toBe('u1');
    expect(user!.username).toBe('alice');
    expect(user!.letterCount).toBe(2);
  });

  it('returns null for non-existent user', () => {
    expect(usersService.getUserById('nonexistent')).toBeNull();
  });

  it('returns zero letterCount when no letters', () => {
    seedUser('u1', 'alice', 'Alice', '');
    const user = usersService.getUserById('u1');
    expect(user!.letterCount).toBe(0);
  });
});

// ── deleteUser ────────────────────────────────────────────────────────

describe('deleteUser', () => {
  it('deletes the user row', () => {
    seedUser('u1', 'alice', 'Alice', '');
    usersService.deleteUser('u1');
    expect(
      ctx.db.prepare('SELECT * FROM users WHERE id = ?').get('u1'),
    ).toBeUndefined();
  });

  it('cascades to delete the user\'s letters', () => {
    seedUser('u1', 'alice', 'Alice', '');
    seedLetter('l1', 'u1');
    seedLetter('l2', 'u1');

    usersService.deleteUser('u1');

    const count = ctx.db.prepare(
      'SELECT COUNT(*) as c FROM letters WHERE author_id = ?',
    ).get('u1') as any;
    expect(count.c).toBe(0);
  });

  it('cascades to delete the user\'s refresh tokens', () => {
    seedUser('u1', 'alice', 'Alice', '');
    seedToken('rt1', 'u1');
    seedToken('rt2', 'u1');

    usersService.deleteUser('u1');

    const count = ctx.db.prepare(
      'SELECT COUNT(*) as c FROM refresh_tokens WHERE user_id = ?',
    ).get('u1') as any;
    expect(count.c).toBe(0);
  });

  it('does not delete other users\' data', () => {
    seedUser('u1', 'alice', 'Alice', '');
    seedUser('u2', 'bob', 'Bob', '');
    seedLetter('l1', 'u1');
    seedLetter('l2', 'u2');

    usersService.deleteUser('u1');

    // u2's letter survives
    const count = ctx.db.prepare(
      'SELECT COUNT(*) as c FROM letters WHERE author_id = ?',
    ).get('u2') as any;
    expect(count.c).toBe(1);

    // u2 still exists
    expect(
      ctx.db.prepare('SELECT * FROM users WHERE id = ?').get('u2'),
    ).toBeTruthy();
  });

  it('is a no-op for non-existent user (no error)', () => {
    expect(() => usersService.deleteUser('no-such-user')).not.toThrow();
  });
});

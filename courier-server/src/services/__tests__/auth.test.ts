import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

vi.hoisted(() => {
  process.env.JWT_SECRET = 'vitest-jwt-secret';
});

import Database from 'better-sqlite3';

// ── Hoisted in-memory DB ──────────────────────────────────────────────

const ctx = vi.hoisted(() => {
  const Database = require('better-sqlite3');
  const db: ReturnType<typeof Database> = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return { db };
});

// ── Mocks ─────────────────────────────────────────────────────────────

vi.mock('../../db', () => ({ default: ctx.db }));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(async (pw: string) => `hashed:${pw}`),
    compare: vi.fn(async (pw: string, hash: string) => hash === `hashed:${pw}`),
  },
}));

let idCounter = 0;
vi.mock('uuid', () => ({
  v4: vi.fn(() => {
    idCounter++;
    return `mock-uuid-${idCounter}`;
  }),
}));

vi.mock('unique-names-generator', () => ({
  uniqueNamesGenerator: vi.fn(() => 'test-user-abc'),
  adjectives: ['red', 'blue'],
  animals: ['fox', 'owl'],
}));

// ── Import under test ─────────────────────────────────────────────────

import * as authService from '../auth';

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

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
});

beforeEach(() => {
  ctx.db.prepare('DELETE FROM refresh_tokens').run();
  ctx.db.prepare('DELETE FROM users').run();
  idCounter = 0;
});

// ── generateUsername ──────────────────────────────────────────────────

describe('generateUsername', () => {
  it('returns a string in lowercase with hyphens', () => {
    const name = authService.generateUsername();
    expect(name).toBe('test-user-abc');
  });
});

// ── register ──────────────────────────────────────────────────────────

describe('register', () => {
  it('creates a user and returns auth tokens', async () => {
    const result = await authService.register('Alice', 'Hi!', 'GB', 'password123');

    expect(result.user.username).toBe('test-user-abc');
    expect(result.user.displayName).toBe('Alice');
    expect(result.user.bio).toBe('Hi!');
    expect(result.user.country).toBe('GB');
    expect(result.user.id).toBe('mock-uuid-1');
    expect(result.token).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();

    // Verify user row in DB
    const user = ctx.db.prepare('SELECT * FROM users WHERE id = ?').get('mock-uuid-1') as any;
    expect(user).toBeTruthy();
    expect(user.password_hash).toBe('hashed:password123');
    expect(user.country).toBe('GB');
  });

  it('creates a refresh token row', async () => {
    const result = await authService.register('Bob', '', '', '12345678');

    const rt = ctx.db.prepare('SELECT * FROM refresh_tokens WHERE user_id = ?').get(result.user.id) as any;
    expect(rt).toBeTruthy();
    expect(rt.id).toBe(result.refreshToken);
  });

  it('trims and truncates displayName to 50 chars', async () => {
    const result = await authService.register('  ' + 'x'.repeat(60) + '  ', '', '', '12345678');
    expect(result.user.displayName).toHaveLength(50);
    expect(result.user.displayName).toBe('x'.repeat(50));
  });

  it('trims and truncates bio to 200 chars', async () => {
    const result = await authService.register('', '  ' + 'y'.repeat(250) + '  ', '', '12345678');
    expect(result.user.bio).toHaveLength(200);
    expect(result.user.bio).toBe('y'.repeat(200));
  });

  it('uppercases and truncates country to 2 chars', async () => {
    const result = await authService.register('', '', 'usax', '12345678');
    expect(result.user.country).toBe('US');
  });

  it('handles undefined displayName and bio', async () => {
    const result = await authService.register(undefined, undefined, undefined, '12345678');
    expect(result.user.displayName).toBe('');
    expect(result.user.bio).toBe('');
    expect(result.user.country).toBe('');
  });
});

// ── login ─────────────────────────────────────────────────────────────

describe('login', () => {
  beforeEach(async () => {
    await authService.register('Alice', '', 'GB', 'correct-password');
  });

  it('returns auth tokens for correct credentials', async () => {
    const result = await authService.login('test-user-abc', 'correct-password');
    expect(result).not.toBeNull();
    expect(result!.user.username).toBe('test-user-abc');
    expect(result!.user.displayName).toBe('Alice');
    expect(result!.token).toBeTruthy();
    expect(result!.refreshToken).toBeTruthy();
  });

  it('returns null for wrong password', async () => {
    const result = await authService.login('test-user-abc', 'wrong-password');
    expect(result).toBeNull();
  });

  it('returns null for non-existent username', async () => {
    const result = await authService.login('nobody', 'password');
    expect(result).toBeNull();
  });

  it('is case-insensitive for username', async () => {
    const result = await authService.login('TEST-USER-ABC', 'correct-password');
    expect(result).not.toBeNull();
    expect(result!.user.username).toBe('test-user-abc');
  });

  it('creates a new refresh token on each login', async () => {
    const r1 = await authService.login('test-user-abc', 'correct-password');
    const r2 = await authService.login('test-user-abc', 'correct-password');
    expect(r1!.refreshToken).not.toBe(r2!.refreshToken);
  });
});

// ── refreshAccessToken ────────────────────────────────────────────────

describe('refreshAccessToken', () => {
  let refreshToken: string;
  let userId: string;

  beforeEach(async () => {
    const result = await authService.register('Alice', '', 'GB', 'pw12345678');
    refreshToken = result.refreshToken;
    userId = result.user.id;
  });

  it('returns a new access token for a valid refresh token', () => {
    const result = authService.refreshAccessToken(refreshToken);
    expect(result).not.toBeNull();
    expect(result!.token).toBeTruthy();
    expect(result!.user.id).toBe(userId);
    expect(result!.refreshToken).toBe(refreshToken);
  });

  it('returns null for an invalid refresh token', () => {
    const result = authService.refreshAccessToken('nonexistent');
    expect(result).toBeNull();
  });

  it('returns null and deletes expired refresh token', () => {
    // Manually set the refresh token to expired
    const pastDate = new Date(Date.now() - 1000).toISOString();
    ctx.db.prepare('UPDATE refresh_tokens SET expires_at = ? WHERE id = ?').run(pastDate, refreshToken);

    const result = authService.refreshAccessToken(refreshToken);
    expect(result).toBeNull();

    // Token should be deleted
    const row = ctx.db.prepare('SELECT * FROM refresh_tokens WHERE id = ?').get(refreshToken);
    expect(row).toBeUndefined();
  });
});

// ── getProfile ────────────────────────────────────────────────────────

describe('getProfile', () => {
  let userId: string;

  beforeEach(async () => {
    const result = await authService.register('Bob', 'A person', 'US', 'pw12345678');
    userId = result.user.id;
  });

  it('returns the user profile by id', () => {
    const profile = authService.getProfile(userId);
    expect(profile).not.toBeNull();
    expect(profile!.username).toBe('test-user-abc');
    expect(profile!.displayName).toBe('Bob');
    expect(profile!.bio).toBe('A person');
    expect(profile!.country).toBe('US');
    expect(profile!.createdAt).toBeTruthy();
  });

  it('returns null for unknown user id', () => {
    const profile = authService.getProfile('no-such-id');
    expect(profile).toBeNull();
  });
});

// ── updateProfile ─────────────────────────────────────────────────────

describe('updateProfile', () => {
  let userId: string;

  beforeEach(async () => {
    const result = await authService.register('Old Name', 'Old bio', 'GB', 'pw12345678');
    userId = result.user.id;
  });

  it('updates displayName', () => {
    const result = authService.updateProfile(userId, 'New Name', undefined, undefined);
    expect(result.displayName).toBe('New Name');

    const profile = authService.getProfile(userId);
    expect(profile!.displayName).toBe('New Name');
    // Other fields unchanged
    expect(profile!.bio).toBe('Old bio');
    expect(profile!.country).toBe('GB');
  });

  it('updates bio', () => {
    const result = authService.updateProfile(userId, undefined, 'New bio', undefined);
    expect(result.bio).toBe('New bio');
  });

  it('updates country', () => {
    const result = authService.updateProfile(userId, undefined, undefined, 'fr');
    expect(result.country).toBe('FR');

    const profile = authService.getProfile(userId);
    expect(profile!.country).toBe('FR');
  });

  it('updates multiple fields at once', () => {
    const result = authService.updateProfile(userId, 'Multi', 'Multi bio', 'de');
    expect(result.displayName).toBe('Multi');
    expect(result.bio).toBe('Multi bio');
    expect(result.country).toBe('DE');
  });

  it('returns empty object when nothing provided', () => {
    const result = authService.updateProfile(userId);
    expect(result).toEqual({});
  });

  it('trims and truncates displayName', () => {
    authService.updateProfile(userId, '  ' + 'z'.repeat(60) + '  ', undefined, undefined);
    const profile = authService.getProfile(userId);
    expect(profile!.displayName).toBe('z'.repeat(50));
  });

  it('trims and truncates bio', () => {
    authService.updateProfile(userId, undefined, '  ' + 'w'.repeat(250) + '  ', undefined);
    const profile = authService.getProfile(userId);
    expect(profile!.bio).toBe('w'.repeat(200));
  });
});

// ── lookupUser ────────────────────────────────────────────────────────

describe('lookupUser', () => {
  beforeEach(async () => {
    await authService.register('Charlie', 'A user', 'US', 'pw12345678');
  });

  it('returns user info for existing username', () => {
    const result = authService.lookupUser('test-user-abc');
    expect(result).not.toBeNull();
    expect(result!.exists).toBe(true);
    expect(result!.username).toBe('test-user-abc');
    expect(result!.displayName).toBe('Charlie');
    expect(result!.bio).toBe('A user');
    expect(result!.country).toBe('US');
  });

  it('returns { exists: false } for non-existent username', () => {
    const result = authService.lookupUser('nobody');
    expect(result).not.toBeNull();
    expect(result!.exists).toBe(false);
    expect(result!.username).toBeUndefined();
  });

  it('is case-insensitive', () => {
    const result = authService.lookupUser('TEST-USER-ABC');
    expect(result!.exists).toBe(true);
    expect(result!.username).toBe('test-user-abc');
  });

  it('includes delivery estimate when requester has country', () => {
    // Insert a second user (GB) directly to avoid username collision with the mock
    ctx.db.prepare(
      'INSERT INTO users (id, username, display_name, bio, country, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run('user-uk', 'dave-uk', 'Dave', '', 'GB', 'hash', NOW);
    // Dave (GB) looks up Charlie (US)
    const result = authService.lookupUser('test-user-abc', 'user-uk');
    // GB → US ≈ 29 hours
    expect(result!.deliveryEstimateHours).toBeGreaterThan(0);
  });

  it('omits delivery estimate when requester has no country', () => {
    // Insert a second user with no country
    ctx.db.prepare(
      'INSERT INTO users (id, username, display_name, bio, country, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run('user-noloc', 'eve-noloc', 'Eve', '', '', 'hash', NOW);
    const result = authService.lookupUser('test-user-abc', 'user-noloc');
    expect(result!.deliveryEstimateHours).toBeUndefined();
  });
});

// ── revokeRefreshToken ────────────────────────────────────────────────

describe('revokeRefreshToken', () => {
  it('deletes the refresh token row', async () => {
    const result = await authService.register('Eve', '', '', 'pw12345678');
    const rt = result.refreshToken;

    // Token exists
    expect(
      ctx.db.prepare('SELECT * FROM refresh_tokens WHERE id = ?').get(rt),
    ).toBeTruthy();

    authService.revokeRefreshToken(rt);

    // Token deleted
    expect(
      ctx.db.prepare('SELECT * FROM refresh_tokens WHERE id = ?').get(rt),
    ).toBeUndefined();
  });

  it('is a no-op for non-existent token (no error)', () => {
    expect(() => authService.revokeRefreshToken('nonexistent')).not.toThrow();
  });
});

// ── revokeAllRefreshTokens ────────────────────────────────────────────

describe('revokeAllRefreshTokens', () => {
  it('deletes all refresh tokens for a user', async () => {
    const result = await authService.register('Frank', '', '', 'pw12345678');
    // Login twice to create multiple refresh tokens
    await authService.login('test-user-abc', 'pw12345678');
    await authService.login('test-user-abc', 'pw12345678');

    const count = ctx.db.prepare(
      'SELECT COUNT(*) as c FROM refresh_tokens WHERE user_id = ?',
    ).get(result.user.id) as any;
    expect(count.c).toBeGreaterThanOrEqual(2);

    authService.revokeAllRefreshTokens(result.user.id);

    const after = ctx.db.prepare(
      'SELECT COUNT(*) as c FROM refresh_tokens WHERE user_id = ?',
    ).get(result.user.id) as any;
    expect(after.c).toBe(0);
  });

  it('is a no-op for user with no tokens', () => {
    expect(() => authService.revokeAllRefreshTokens('no-such-user')).not.toThrow();
  });
});

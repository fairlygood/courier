import { describe, it, expect, vi } from 'vitest';

vi.hoisted(() => {
  process.env.JWT_SECRET = 'vitest-jwt-secret';
});

import jwt from 'jsonwebtoken';
import {
  signAccessToken,
  signRefreshToken,
  getRefreshTokenExpiry,
  verifyToken,
} from '../auth';

// ── signAccessToken ───────────────────────────────────────────────────

describe('signAccessToken', () => {
  it('returns a non-empty string', () => {
    const token = signAccessToken({ userId: 'user-1' });
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
  });

  it('embeds the payload (decodable without verification)', () => {
    const token = signAccessToken({ userId: 'test-user-123' });
    const decoded = jwt.decode(token) as any;
    expect(decoded.userId).toBe('test-user-123');
  });

  it('round-trips through verifyToken', () => {
    const payload = { userId: 'user-roundtrip' };
    const token = signAccessToken(payload);
    const verified = verifyToken(token);
    expect(verified.userId).toBe('user-roundtrip');
  });

  it('sets 24h expiry', () => {
    const token = signAccessToken({ userId: 'u' });
    const decoded = jwt.decode(token) as any;
    // iat + 24h should roughly equal exp
    expect(decoded.exp).toBeDefined();
    expect(decoded.iat).toBeDefined();
    expect(decoded.exp - decoded.iat).toBe(24 * 60 * 60);
  });

  it('produces different tokens for different payloads', () => {
    const t1 = signAccessToken({ userId: 'a' });
    const t2 = signAccessToken({ userId: 'b' });
    expect(t1).not.toBe(t2);
  });

  it('same payload twice → both decode to same userId', () => {
    const t1 = signAccessToken({ userId: 'same' });
    const t2 = signAccessToken({ userId: 'same' });
    // Both should decode to the same userId regardless of iat
    const d1 = jwt.decode(t1) as any;
    const d2 = jwt.decode(t2) as any;
    expect(d1.userId).toBe('same');
    expect(d2.userId).toBe('same');
  });
});

// ── signRefreshToken ──────────────────────────────────────────────────

describe('signRefreshToken', () => {
  it('returns a UUID-formatted string', () => {
    const token = signRefreshToken();
    expect(token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('produces unique tokens on each call', () => {
    const tokens = new Set(Array.from({ length: 20 }, () => signRefreshToken()));
    expect(tokens.size).toBe(20);
  });
});

// ── getRefreshTokenExpiry ─────────────────────────────────────────────

describe('getRefreshTokenExpiry', () => {
  it('returns an ISO 8601 string', () => {
    const expiry = getRefreshTokenExpiry();
    expect(expiry).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('is in the future (~30 days)', () => {
    const now = Date.now();
    const expiryMs = new Date(getRefreshTokenExpiry()).getTime();
    const diffDays = (expiryMs - now) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(29);
    expect(diffDays).toBeLessThan(31);
  });

  it('returns monotonically increasing values', () => {
    const e1 = getRefreshTokenExpiry();
    const e2 = getRefreshTokenExpiry();
    expect(new Date(e2).getTime()).toBeGreaterThanOrEqual(new Date(e1).getTime());
  });
});

// ── verifyToken ───────────────────────────────────────────────────────

describe('verifyToken', () => {
  it('decodes a valid token back to the original payload', () => {
    const token = signAccessToken({ userId: 'verify-me' });
    const result = verifyToken(token);
    expect(result.userId).toBe('verify-me');
  });

  it('throws on a tampered token', () => {
    const token = signAccessToken({ userId: 'real' });
    // Flip the last character of the payload
    const parts = token.split('.');
    const tampered = `${parts[0]}.${parts[1]}X.${parts[2]}`;
    expect(() => verifyToken(tampered)).toThrow();
  });

  it('throws on an empty string', () => {
    expect(() => verifyToken('')).toThrow();
  });

  it('throws on garbage input', () => {
    expect(() => verifyToken('not-a-jwt')).toThrow();
    expect(() => verifyToken('a.b.c')).toThrow();
  });

  it('throws on an expired token', async () => {
    // Sign a token that expires in 0 seconds
    const expiredToken = jwt.sign(
      { userId: 'expired' },
      process.env.JWT_SECRET!,
      { expiresIn: '0s' },
    );
    // Small delay to ensure it's past the expiry
    await new Promise((r) => setTimeout(r, 10));
    expect(() => verifyToken(expiredToken)).toThrow();
  });
});

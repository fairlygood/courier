import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  lookupSchema,
  refreshSchema,
} from '../auth';

// ── registerSchema ────────────────────────────────────────────────────

describe('registerSchema', () => {
  it('accepts minimal valid input (password only)', () => {
    const result = registerSchema.safeParse({ password: '12345678' });
    expect(result.success).toBe(true);
  });

  it('accepts full valid input', () => {
    const result = registerSchema.safeParse({
      displayName: 'Alice',
      bio: 'Hello world',
      country: 'GB',
      password: '12345678',
    });
    expect(result.success).toBe(true);
  });

  it('rejects password shorter than 8 characters', () => {
    const result = registerSchema.safeParse({ password: 'short' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('at least 8');
    }
  });

  it('rejects missing password', () => {
    const result = registerSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects displayName longer than 50 chars', () => {
    const result = registerSchema.safeParse({
      password: '12345678',
      displayName: 'a'.repeat(51),
    });
    expect(result.success).toBe(false);
  });

  it('rejects bio longer than 200 chars', () => {
    const result = registerSchema.safeParse({
      password: '12345678',
      bio: 'a'.repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it('rejects country that is not exactly 2 chars', () => {
    const tooShort = registerSchema.safeParse({ password: '12345678', country: 'A' });
    expect(tooShort.success).toBe(false);

    const tooLong = registerSchema.safeParse({ password: '12345678', country: 'ABC' });
    expect(tooLong.success).toBe(false);
  });

  it('accepts country that is exactly 2 chars', () => {
    const result = registerSchema.safeParse({ password: '12345678', country: 'US' });
    expect(result.success).toBe(true);
  });
});

// ── loginSchema ────────────────────────────────────────────────────────

describe('loginSchema', () => {
  it('accepts valid username + password', () => {
    const result = loginSchema.safeParse({ username: 'alice', password: 'secret' });
    expect(result.success).toBe(true);
  });

  it('rejects missing username', () => {
    const result = loginSchema.safeParse({ password: 'secret' });
    expect(result.success).toBe(false);
  });

  it('rejects missing password', () => {
    const result = loginSchema.safeParse({ username: 'alice' });
    expect(result.success).toBe(false);
  });

  it('rejects empty username', () => {
    const result = loginSchema.safeParse({ username: '', password: 'secret' });
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({ username: 'alice', password: '' });
    expect(result.success).toBe(false);
  });
});

// ── updateProfileSchema ───────────────────────────────────────────────

describe('updateProfileSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = updateProfileSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts displayName only', () => {
    const result = updateProfileSchema.safeParse({ displayName: 'Bob' });
    expect(result.success).toBe(true);
  });

  it('accepts bio only', () => {
    const result = updateProfileSchema.safeParse({ bio: 'A bio' });
    expect(result.success).toBe(true);
  });

  it('accepts country only', () => {
    const result = updateProfileSchema.safeParse({ country: 'FR' });
    expect(result.success).toBe(true);
  });

  it('rejects empty displayName', () => {
    const result = updateProfileSchema.safeParse({ displayName: '' });
    expect(result.success).toBe(false);
  });

  it('rejects displayName over 50 chars', () => {
    const result = updateProfileSchema.safeParse({ displayName: 'a'.repeat(51) });
    expect(result.success).toBe(false);
  });

  it('rejects bio over 200 chars', () => {
    const result = updateProfileSchema.safeParse({ bio: 'a'.repeat(201) });
    expect(result.success).toBe(false);
  });

  it('rejects country that is not exactly 2 chars', () => {
    const result = updateProfileSchema.safeParse({ country: 'A' });
    expect(result.success).toBe(false);
  });

  it('ignores extra unknown fields (Zod default passthrough)', () => {
    // Zod .object() strips unknown fields by default — they are ignored, not rejected
    const result = updateProfileSchema.safeParse({ password: 'hacked' });
    expect(result.success).toBe(true);
  });
});

// ── lookupSchema ──────────────────────────────────────────────────────

describe('lookupSchema', () => {
  it('accepts valid username', () => {
    const result = lookupSchema.safeParse({ username: 'someone' });
    expect(result.success).toBe(true);
  });

  it('rejects missing username', () => {
    const result = lookupSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects empty username', () => {
    const result = lookupSchema.safeParse({ username: '' });
    expect(result.success).toBe(false);
  });
});

// ── refreshSchema ─────────────────────────────────────────────────────

describe('refreshSchema', () => {
  it('accepts valid refresh token', () => {
    const result = refreshSchema.safeParse({
      refreshToken: 'some-uuid-token',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing refreshToken', () => {
    const result = refreshSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects empty refreshToken', () => {
    const result = refreshSchema.safeParse({ refreshToken: '' });
    expect(result.success).toBe(false);
  });
});

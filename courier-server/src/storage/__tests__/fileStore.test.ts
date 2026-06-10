import { describe, it, expect, vi } from 'vitest';
import crypto from 'crypto';

// fileStore.ts runs fs.mkdirSync at module eval — mock fs before import
vi.mock('fs', () => ({
  default: {
    mkdirSync: vi.fn(() => {}),
    existsSync: vi.fn(() => false),
    writeFileSync: vi.fn(() => {}),
  },
}));

import { hashBuffer, getThumbnailPath } from '../fileStore';

// ── hashBuffer ────────────────────────────────────────────────────────

describe('hashBuffer', () => {
  it('returns a 64-character hex string (SHA-256)', () => {
    const hash = hashBuffer(Buffer.from('hello'));
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic — same input → same hash', () => {
    const input = Buffer.from('consistent input');
    expect(hashBuffer(input)).toBe(hashBuffer(input));
  });

  it('different inputs → different hashes', () => {
    const h1 = hashBuffer(Buffer.from('alpha'));
    const h2 = hashBuffer(Buffer.from('beta'));
    expect(h1).not.toBe(h2);
  });

  it('matches known SHA-256 vector (empty buffer)', () => {
    const hash = hashBuffer(Buffer.from(''));
    expect(hash).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('matches known SHA-256 vector ("abc")', () => {
    const hash = hashBuffer(Buffer.from('abc'));
    expect(hash).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('handles binary data (not just text)', () => {
    const binary = Buffer.from([0x00, 0xFF, 0x7F, 0x80, 0x01]);
    const hash = hashBuffer(binary);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('handles large buffers without error', () => {
    const large = Buffer.alloc(1024 * 1024, 'x'); // 1 MB
    const hash = hashBuffer(large);
    expect(hash).toHaveLength(64);
  });
});

// ── getThumbnailPath ──────────────────────────────────────────────────

describe('getThumbnailPath', () => {
  it('returns a path containing the hash', () => {
    const hash = 'abc123def456';
    const path = getThumbnailPath(hash);
    expect(path).toContain(hash);
  });

  it('returns a path ending with the hash', () => {
    const hash = 'abc123def456';
    const path = getThumbnailPath(hash);
    expect(path.endsWith(hash)).toBe(true);
  });

  it('returns the same prefix for different hashes', () => {
    const p1 = getThumbnailPath('aaa');
    const p2 = getThumbnailPath('bbb');
    // Both should share the same directory prefix
    const dir1 = p1.substring(0, p1.lastIndexOf('/'));
    const dir2 = p2.substring(0, p2.lastIndexOf('/'));
    expect(dir1).toBe(dir2);
  });

  it('handles empty hash (degenerate)', () => {
    const p = getThumbnailPath('');
    // path.join normalizes trailing empty segment
    expect(p.endsWith('thumbnails')).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { createLetterSchema } from '../letters';

describe('createLetterSchema', () => {
  it('accepts minimal valid input (pages only, public)', () => {
    const result = createLetterSchema.safeParse({
      pages: [{ fieldname: 'pages' }],
      isPublic: 'true',
    });
    expect(result.success).toBe(true);
  });

  it('accepts direct letter with recipientUsername', () => {
    const result = createLetterSchema.safeParse({
      pages: [{ fieldname: 'pages' }],
      recipientUsername: 'someone',
    });
    expect(result.success).toBe(true);
  });

  it('accepts full input with description', () => {
    const result = createLetterSchema.safeParse({
      pages: [{ fieldname: 'pages' }],
      isPublic: 'true',
      description: 'A lovely letter',
      recipientUsername: undefined,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing pages', () => {
    const result = createLetterSchema.safeParse({
      isPublic: 'true',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty pages array', () => {
    const result = createLetterSchema.safeParse({
      pages: [],
      isPublic: 'true',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message.toLowerCase()).toContain('at least one page');
    }
  });

  it('rejects description longer than 500 chars', () => {
    const result = createLetterSchema.safeParse({
      pages: [{ fieldname: 'pages' }],
      description: 'a'.repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it('accepts description exactly at 500 chars', () => {
    const result = createLetterSchema.safeParse({
      pages: [{ fieldname: 'pages' }],
      description: 'a'.repeat(500),
    });
    expect(result.success).toBe(true);
  });

  it('accepts boolean isPublic', () => {
    const result = createLetterSchema.safeParse({
      pages: [{ fieldname: 'pages' }],
      isPublic: true,
    });
    expect(result.success).toBe(true);
  });

  it('accepts string "false" isPublic', () => {
    const result = createLetterSchema.safeParse({
      pages: [{ fieldname: 'pages' }],
      isPublic: 'false',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty recipientUsername', () => {
    const result = createLetterSchema.safeParse({
      pages: [{ fieldname: 'pages' }],
      recipientUsername: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-boolean/string isPublic', () => {
    const result = createLetterSchema.safeParse({
      pages: [{ fieldname: 'pages' }],
      isPublic: 123,
    });
    expect(result.success).toBe(false);
  });
});

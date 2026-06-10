import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { uniqueNamesGenerator, adjectives, animals } from 'unique-names-generator';
import db from '../db';
import { signAccessToken, signRefreshToken, getRefreshTokenExpiry, AuthPayload } from '../auth';
import { computeDeliveryDelay } from './geo';
import type { UserRow, UserProfile, AuthResponse, UserLookup } from '../types';

export function generateUsername(): string {
  return uniqueNamesGenerator({
    dictionaries: [adjectives, adjectives, animals],
    separator: '-',
    style: 'lowerCase',
  });
}

export async function register(displayName: string | undefined, bio: string | undefined, country: string | undefined, password: string): Promise<AuthResponse> {
  const id = uuidv4();
  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash(password, 10);
  const name = (displayName || '').trim().slice(0, 50);
  const bioText = (bio || '').trim().slice(0, 200);
  const countryCode = (country || '').trim().toUpperCase().slice(0, 2);

  // Retry on username collision (UNIQUE constraint)
  let username = '';
  for (let attempt = 0; attempt < 5; attempt++) {
    username = generateUsername();
    try {
      db.prepare(
        'INSERT INTO users (id, username, display_name, bio, country, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ).run(id, username, name, bioText, countryCode, passwordHash, now);
      break;
    } catch (err: any) {
      if (err.code !== 'SQLITE_CONSTRAINT_UNIQUE' || attempt === 4) throw err;
    }
  }

  const token = signAccessToken({ userId: id });
  const refreshToken = signRefreshToken();
  const expiresAt = getRefreshTokenExpiry();

  db.prepare(
    'INSERT INTO refresh_tokens (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
  ).run(refreshToken, id, expiresAt, now);

  return {
    token,
    refreshToken,
    user: { id, username, displayName: name, bio: bioText, country: countryCode },
  };
}

export async function login(username: string, password: string): Promise<AuthResponse | null> {
  const user = db.prepare(
    'SELECT id, username, display_name, bio, country, password_hash FROM users WHERE username = ?',
  ).get(username.trim().toLowerCase()) as UserRow | undefined;

  if (!user) return null;

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return null;

  const token = signAccessToken({ userId: user.id });
  const refreshToken = signRefreshToken();
  const now = new Date().toISOString();
  const expiresAt = getRefreshTokenExpiry();

  db.prepare(
    'INSERT INTO refresh_tokens (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
  ).run(refreshToken, user.id, expiresAt, now);

  return {
    token,
    refreshToken,
    user: { id: user.id, username: user.username, displayName: user.display_name, bio: user.bio, country: user.country },
  };
}

export function refreshAccessToken(refreshToken: string): AuthResponse | null {
  const row = db.prepare(
    'SELECT rt.user_id, rt.expires_at, u.username, u.display_name, u.bio, u.country FROM refresh_tokens rt JOIN users u ON rt.user_id = u.id WHERE rt.id = ?',
  ).get(refreshToken) as { user_id: string; expires_at: string; username: string; display_name: string; bio: string; country: string } | undefined;

  if (!row) return null;

  if (new Date(row.expires_at) < new Date()) {
    db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(refreshToken);
    return null;
  }

  const token = signAccessToken({ userId: row.user_id });
  return {
    token,
    refreshToken,
    user: { id: row.user_id, username: row.username, displayName: row.display_name, bio: row.bio, country: row.country },
  };
}

export function getProfile(userId: string): UserProfile | null {
  const user = db.prepare(
    'SELECT id, username, display_name, bio, country, created_at FROM users WHERE id = ?',
  ).get(userId) as UserRow | undefined;

  if (!user) return null;

  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    bio: user.bio,
    country: user.country,
    createdAt: user.created_at,
  };
}

export function updateProfile(userId: string, displayName?: string, bio?: string, country?: string): { displayName?: string; bio?: string; country?: string } {
  const updates: Record<string, string> = {};
  if (displayName !== undefined) {
    const name = displayName.trim().slice(0, 50);
    db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(name, userId);
    updates.displayName = name;
  }
  if (bio !== undefined) {
    const trimmed = bio.trim().slice(0, 200);
    db.prepare('UPDATE users SET bio = ? WHERE id = ?').run(trimmed, userId);
    updates.bio = trimmed;
  }
  if (country !== undefined) {
    const countryCode = country.trim().toUpperCase().slice(0, 2);
    db.prepare('UPDATE users SET country = ? WHERE id = ?').run(countryCode, userId);
    updates.country = countryCode;
  }
  return updates;
}

export function lookupUser(username: string, requesterId?: string): UserLookup | null {
  const user = db.prepare(
    'SELECT id, username, display_name, bio, country FROM users WHERE username = ?',
  ).get(username.trim().toLowerCase()) as UserRow | undefined;

  if (!user) return { exists: false };

  let deliveryEstimateHours: number | undefined;
  if (requesterId && user.country) {
    const requester = db.prepare('SELECT country FROM users WHERE id = ?').get(requesterId) as { country: string } | undefined;
    if (requester?.country) {
      deliveryEstimateHours = computeDeliveryDelay(requester.country, user.country);
    }
  }

  return {
    exists: true,
    username: user.username,
    displayName: user.display_name,
    bio: user.bio,
    country: user.country,
    deliveryEstimateHours,
  };
}

export function revokeRefreshToken(token: string): void {
  db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(token);
}

export function revokeAllRefreshTokens(userId: string): void {
  db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(userId);
}

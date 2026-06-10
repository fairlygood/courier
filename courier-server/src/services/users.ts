import db from '../db';
import type { UserRow } from '../types';

export interface AdminUserRow {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  letterCount: number;
  createdAt: string;
}

export function getAllUsers(): AdminUserRow[] {
  const rows = db.prepare(`
    SELECT u.id, u.username, u.display_name, u.bio, u.created_at,
           COUNT(l.id) as letter_count
    FROM users u
    LEFT JOIN letters l ON l.author_id = u.id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `).all() as (UserRow & { letter_count: number })[];

  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    displayName: r.display_name,
    bio: r.bio,
    letterCount: r.letter_count,
    createdAt: r.created_at,
  }));
}

export function getUserById(id: string): AdminUserRow | null {
  const row = db.prepare(`
    SELECT u.id, u.username, u.display_name, u.bio, u.created_at,
           COUNT(l.id) as letter_count
    FROM users u
    LEFT JOIN letters l ON l.author_id = u.id
    WHERE u.id = ?
    GROUP BY u.id
  `).get(id) as (UserRow & { letter_count: number }) | undefined;

  if (!row) return null;

  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    bio: row.bio,
    letterCount: row.letter_count,
    createdAt: row.created_at,
  };
}

export function deleteUser(id: string): void {
  // Delete user's letters first (no FK cascade in schema)
  db.prepare('DELETE FROM letters WHERE author_id = ?').run(id);
  db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(id);
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
}

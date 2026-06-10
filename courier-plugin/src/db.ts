export interface StoredAuth {
  token: string;
  refreshToken: string;
  userId: string;
  username: string;
  displayName: string;
  bio: string;
  country: string;
}

const GLOBAL_KEY = '__courier_auth';

// In-memory auth store. Falls back from global, then SQLite.
let memoryAuth: StoredAuth | null = null;
let dbPromise: Promise<any> | null = null;

function globalAuth(): StoredAuth | null {
  try {
    return (globalThis as any)[GLOBAL_KEY] || null;
  } catch {
    return null;
  }
}

function setGlobalAuth(auth: StoredAuth | null): void {
  try {
    (globalThis as any)[GLOBAL_KEY] = auth;
  } catch {}
}

async function getDB() {
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    const SQLite = require('react-native-sqlite-storage');
    SQLite.enablePromise(true);
    const db = await SQLite.openDatabase({ name: 'courier.db', location: 'default' });
    await db.executeSql(
      'CREATE TABLE IF NOT EXISTS auth (id INTEGER PRIMARY KEY CHECK (id = 1), token TEXT NOT NULL, refresh_token TEXT NOT NULL, user_id TEXT NOT NULL, username TEXT NOT NULL, display_name TEXT DEFAULT \'\', bio TEXT DEFAULT \'\', country TEXT DEFAULT \'\')',
    );
    return db;
  })();

  return dbPromise;
}

export async function saveAuth(auth: StoredAuth): Promise<void> {
  memoryAuth = auth;
  setGlobalAuth(auth);

  try {
    const db = await getDB();
    await db.executeSql(
      'INSERT OR REPLACE INTO auth (id, token, refresh_token, user_id, username, display_name, bio, country) VALUES (1, ?, ?, ?, ?, ?, ?, ?)',
      [auth.token, auth.refreshToken, auth.userId, auth.username, auth.displayName, auth.bio, auth.country || ''],
    );
  } catch (err) {
    console.error('saveAuth error:', err);
  }
}

export async function getStoredAuth(): Promise<StoredAuth | null> {
  if (memoryAuth) return memoryAuth;

  const g = globalAuth();
  if (g) {
    memoryAuth = g;
    return g;
  }

  try {
    const db = await getDB();
    const [results] = await db.executeSql('SELECT * FROM auth WHERE id = 1');
    if (results.rows.length === 0) return null;
    const row = results.rows.item(0);
    memoryAuth = {
      token: row.token,
      refreshToken: row.refresh_token,
      userId: row.user_id,
      username: row.username,
      displayName: row.display_name,
      bio: row.bio || '',
      country: row.country || '',
    };
    setGlobalAuth(memoryAuth);
    return memoryAuth;
  } catch (err) {
    console.error('getStoredAuth error:', err);
    return null;
  }
}

export async function updateStoredProfile(name: string, bio: string, country?: string): Promise<void> {
  if (memoryAuth) {
    memoryAuth.displayName = name;
    memoryAuth.bio = bio;
    if (country !== undefined) memoryAuth.country = country;
  }

  try {
    const db = await getDB();
    if (country !== undefined) {
      await db.executeSql('UPDATE auth SET display_name = ?, bio = ?, country = ? WHERE id = 1', [name, bio, country]);
    } else {
      await db.executeSql('UPDATE auth SET display_name = ?, bio = ? WHERE id = 1', [name, bio]);
    }
  } catch (err) {
    console.error('updateStoredProfile error:', err);
  }
}

export function clearStoredAuth(): void {
  memoryAuth = null;
  setGlobalAuth(null);

  clearAuthAsync();
}

async function clearAuthAsync(): Promise<void> {
  try {
    const db = await getDB();
    await db.executeSql('DELETE FROM auth');
  } catch (err) {
    console.error('clearAuthAsync error:', err);
  }
}

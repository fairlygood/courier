import { AuthResponse, UserProfile, LetterSummary, LetterDetail, UserLookup } from './types';
import { SERVER_URL } from './config';

const BASE_URL = SERVER_URL;

let token: string | null = null;
let refreshToken: string | null = null;

export function setAuthToken(t: string | null) {
  token = t;
}

export function getAuthToken(): string | null {
  return token;
}

export function setRefreshToken(t: string | null) {
  refreshToken = t;
}

export function getRefreshToken(): string | null {
  return refreshToken;
}

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function tryRefresh(): Promise<boolean> {
  if (!refreshToken) return false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      token = null;
      refreshToken = null;
      return false;
    }
    const data: AuthResponse = await res.json();
    token = data.token;
    const { saveAuth } = require('./db');
    const { getStoredAuth } = require('./db');
    const stored = await getStoredAuth();
    if (stored) {
      await saveAuth({
        token: data.token,
        refreshToken: data.refreshToken || refreshToken || '',
        userId: stored.userId,
        username: stored.username,
        displayName: stored.displayName,
        bio: stored.bio || '',
        country: stored.country || '',
      });
    }
    return true;
  } catch {
    return false;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await authHeaders();
  const url = `${BASE_URL}${path}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: { ...headers, ...(options.headers || {}) },
      signal: controller.signal,
    });
  } catch (fetchErr: any) {
    clearTimeout(timer);
    if (fetchErr.name === 'AbortError') {
      throw new Error('Request timed out. Check your connection.');
    }
    throw new Error(`Network error: ${fetchErr.message || String(fetchErr)}`);
  }

  clearTimeout(timer);

  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      const newHeaders = await authHeaders();
      try {
        res = await fetch(url, {
          ...options,
          headers: { ...newHeaders, ...(options.headers || {}) },
        });
      } catch (fetchErr: any) {
        throw new Error(`Network error: ${fetchErr.message || String(fetchErr)}`);
      }
    }
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }

  try {
    return await res.json();
  } catch {
    const text = await res.text();
    throw new Error(`Invalid JSON response: ${text.slice(0, 200)}`);
  }
}

export async function register(displayName: string, bio: string, country: string | undefined, password: string): Promise<AuthResponse> {
  const res = await request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ displayName, bio, country, password }),
  });
  refreshToken = res.refreshToken;
  return res;
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  const res = await request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  refreshToken = res.refreshToken;
  return res;
}

export async function getProfile(): Promise<UserProfile> {
  return request<UserProfile>('/auth/me');
}

export async function updateProfile(data: { displayName?: string; bio?: string; country?: string }): Promise<{ displayName?: string; bio?: string; country?: string }> {
  return request('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function lookupUser(username: string): Promise<UserLookup> {
  return request<UserLookup>(`/auth/lookup?username=${encodeURIComponent(username)}`);
}

export async function getInbox(): Promise<LetterSummary[]> {
  return request<LetterSummary[]>('/letters/inbox');
}

export async function getPublicFeed(): Promise<LetterSummary[]> {
  return request<LetterSummary[]>('/letters/feed');
}

export async function getLetter(id: string): Promise<LetterDetail> {
  return request<LetterDetail>(`/letters/${id}`);
}

export async function sendLetter(
  pagePaths: string[],
  description: string,
  recipientUsername: string | null,
): Promise<{ id: string; createdAt: string; deliverAt: string }> {
  const formData = new FormData();

  if (recipientUsername) {
    formData.append('recipientUsername', recipientUsername);
  } else {
    formData.append('isPublic', 'true');
  }

  if (description) {
    formData.append('description', description);
  }

  for (let i = 0; i < pagePaths.length; i++) {
    formData.append('pages', {
      uri: `file://${pagePaths[i]}`,
      type: 'image/png',
      name: `page_${i}.png`,
    } as any);
  }

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  let res = await fetch(`${BASE_URL}/letters`, {
    method: 'POST',
    headers,
    body: formData,
    signal: controller.signal,
  });

  clearTimeout(timer);

  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const retryController = new AbortController();
      const retryTimer = setTimeout(() => retryController.abort(), 15000);
      res = await fetch(`${BASE_URL}/letters`, {
        method: 'POST',
        headers,
        body: formData,
        signal: retryController.signal,
      });
      clearTimeout(retryTimer);
    }
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }

  return res.json();
}

export function getAssetUrl(path: string): string {
  return `${BASE_URL}${path}`;
}

export async function deleteLetter(id: string): Promise<void> {
  await request(`/letters/${id}`, { method: 'DELETE' });
}

export async function downloadLetterPdf(letterId: string, destPath: string): Promise<string> {
  let RNFS: any;
  try { RNFS = require('react-native-fs'); } catch {
    throw new Error('Download not available');
  }

  const dir = destPath.substring(0, destPath.lastIndexOf('/'));
  try { await RNFS.mkdir(dir); } catch {}

  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const result = await RNFS.downloadFile({
    fromUrl: `${BASE_URL}/letters/${letterId}/download`,
    toFile: destPath,
    headers,
  }).promise;

  if (result.statusCode !== 200) throw new Error(`Download failed: ${result.statusCode}`);
  return destPath;
}

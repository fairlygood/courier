export interface UserRow {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  country: string;
  password_hash: string;
  created_at: string;
}

export interface LetterRow {
  id: string;
  author_id: string;
  description: string;
  page_hashes: string;
  is_public: number;
  recipient_id: string | null;
  created_at: string;
  deliver_at: string;
  is_read: number;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  country: string;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: UserProfile;
}

export interface LetterSummary {
  id: string;
  description: string;
  pageCount: number;
  thumbnailUrl: string | null;
  authorId: string;
  authorUsername: string;
  authorName: string;
  authorCountry: string;
  createdAt: string;
  deliverAt: string;
  isRead: boolean;
}

export interface SentLetter {
  id: string;
  description: string;
  pageCount: number;
  isPublic: boolean;
  recipientUsername: string | null;
  recipientName: string | null;
  createdAt: string;
  deliverAt: string;
}

export interface UserLookup {
  exists: boolean;
  username?: string;
  displayName?: string;
  bio?: string;
  country?: string;
  deliveryEstimateHours?: number;
}

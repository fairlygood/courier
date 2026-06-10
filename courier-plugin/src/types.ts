export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  country: string;
  createdAt: string;
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

export interface LetterDetail extends LetterSummary {
  // same fields as summary for now
}

export interface UserLookup {
  exists: boolean;
  username?: string;
  displayName?: string;
  bio?: string;
  country?: string;
  deliveryEstimateHours?: number;
}

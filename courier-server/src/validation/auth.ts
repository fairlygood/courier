import { z } from 'zod';

export const registerSchema = z.object({
  displayName: z.string().max(50).optional(),
  bio: z.string().max(200).optional(),
  country: z.string().length(2, 'Country must be a 2-letter ISO code').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(50).optional(),
  bio: z.string().max(200).optional(),
  country: z.string().length(2, 'Country must be a 2-letter ISO code').optional(),
});

export const lookupSchema = z.object({
  username: z.string().min(1, 'Username is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type LookupInput = z.infer<typeof lookupSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;

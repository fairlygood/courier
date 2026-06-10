import { z } from 'zod';

export const createLetterSchema = z.object({
  description: z.string().max(500).optional(),
  isPublic: z.union([z.literal('true'), z.literal('false'), z.boolean()]).optional(),
  recipientUsername: z.string().min(1).optional(),
  pages: z.array(z.any()).min(1, 'At least one page is required'),
});

export type CreateLetterInput = z.infer<typeof createLetterSchema>;

import { z } from 'zod';

export const createFeedbackSchema = z.object({
  callId: z.string().uuid('Invalid call ID format'),
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  comment: z.string().max(1000, 'Comment must be at most 1000 characters').optional(),
});

export type CreateFeedbackRequest = z.infer<typeof createFeedbackSchema>;



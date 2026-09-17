import { z } from 'zod';

export const checkUserSchema = z.object({
  phoneNumber: z.string().length(10),
});

export type CheckUserRequest = z.infer<typeof checkUserSchema>;

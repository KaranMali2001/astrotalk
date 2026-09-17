import { z } from 'zod';

export const initiateServiceSchema = z.object({
  professionalId: z.string(),
});

export const startServiceSchema = z.object({
  profId: z.string(),
  userId: z.string(),
  callId: z.string(),
});

export const endServiceSchema = z.object({
  channelName: z.string(),
});
export const RejectServiceRequest = z.object({
  callId: z.uuidv4(),
  profId: z.string(),
  reason: z.string().optional(),
});
export const cancelCallSchema = z.object({
  callId: z.string().uuid(),
});
export type InitiateServiceRequest = z.infer<typeof initiateServiceSchema>;
export type StartServiceRequest = z.infer<typeof startServiceSchema>;
export type EndServiceRequest = z.infer<typeof endServiceSchema>;
export type RejectServiceRequest = z.infer<typeof RejectServiceRequest>;
export type CancelCallRequest = z.infer<typeof cancelCallSchema>;

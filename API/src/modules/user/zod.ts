import { CallType } from '@prisma/client';
import z from 'zod';

export const loginRequestSchema = z.object({
  phoneNumber: z.string().length(10, 'Phone number must be exactly 10 digits'),
});

export const verifyOtpRequestSchema = z.object({
  otp: z.string(),
  requestId: z.string(),
  phoneNumber: z.string().length(10, 'Phone number must be exactly 10 digits'),
});
export const updateUserRequestSchema = z.object({
  username: z.string(),
  date_of_birth: z.string(),
});
export const cancelCallRequestSchema = z.object({
  callId: z.string(),
  CallType: z.enum(Object.values(CallType)),
  reason: z.string().optional(),
});

export const onboardingRequestSchema = z.object({
  username: z.string().min(1, 'Username is required').optional(),
  dateOfBirth: z.string().refine(
    date => {
      const birthDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      return age > 18 || (age === 18 && monthDiff > 0) || (age === 18 && monthDiff === 0 && today.getDate() >= birthDate.getDate());
    },
    { message: 'You must be at least 18 years old' }
  ),
  language: z.array(z.string()).min(1, 'At least one language is required'),
  gender: z.enum(['male', 'female'], {}),
  categoryIds: z.array(z.string().uuid()).optional(),
  relationshipGoals: z.array(z.string()).min(1, 'Please select at least one relationship goal').max(2, 'Please select at most 2 options'),
});

export type loginRequest = z.infer<typeof loginRequestSchema>;
export type verifyOtpRequest = z.infer<typeof verifyOtpRequestSchema>;
export type updateUserRequest = z.infer<typeof updateUserRequestSchema>;
export type cancelCallRequest = z.infer<typeof cancelCallRequestSchema>;
export type onboardingRequest = z.infer<typeof onboardingRequestSchema>;

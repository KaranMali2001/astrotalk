import { z } from 'zod';

// Admin Authentication (Phone-based like users)
export const AdminLoginSchema = z.object({
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
});

export const AdminVerifyOtpSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits'),
  requestId: z.string(),
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
});

// Wallet Management
export const UpdateUserWalletSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  amount: z.number().int('Amount must be an integer').min(1, 'Amount must be positive'),
  reason: z.string().min(5, 'Reason must be at least 5 characters'),
  type: z.enum(['ADD', 'DEDUCT'], { error: 'Type must be either ADD or DEDUCT' }),
});

export const UpdateProfessionalWalletSchema = z.object({
  professionalId: z.string().uuid('Invalid professional ID format'),
  amount: z.number().int('Amount must be an integer').min(1, 'Amount must be positive'),
  reason: z.string().min(5, 'Reason must be at least 5 characters'),
  type: z.enum(['ADD', 'DEDUCT'], { error: 'Type must be either ADD or DEDUCT' }),
});

// Professional Verification
export const VerifyProfessionalSchema = z.object({
  professionalId: z.string().uuid('Invalid professional ID format'),
  isVerified: z.boolean(),
  verificationNotes: z.string().optional(),
});

export const UpdateProfessionalStatusSchema = z.object({
  professionalId: z.string().uuid('Invalid professional ID format'),
  isActive: z.boolean(),
  reason: z.string().min(3, 'Reason must be at least 3 characters'),
});

// User Management
export const UpdateUserStatusSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  isActive: z.boolean(),
  reason: z.string().min(3, 'Reason must be at least 3 characters'),
});

// Professional Profile Updates
export const UpdateProfessionalRatesSchema = z.object({
  professionalId: z.string().uuid('Invalid professional ID format'),
  perMinuteRateCall: z.number().int().min(100, 'Call rate must be at least �1 (100 paisa)').optional(),
  perMinuteRateChat: z.number().int().min(50, 'Chat rate must be at least �0.50 (50 paisa)').optional(),
});

// Analytics & Reports
export const DateRangeSchema = z
  .object({
    startDate: z.string().datetime('Invalid start date format'),
    endDate: z.string().datetime('Invalid end date format'),
  })
  .refine(data => new Date(data.startDate) < new Date(data.endDate), {
    message: 'Start date must be before end date',
  });

export const PaginationSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).default(1),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).default(10),
});

// Commission Settings
export const UpdateCommissionSchema = z.object({
  newCommissionRate: z.number().min(0.01, 'Commission must be at least 1%').max(0.5, 'Commission cannot exceed 50%'),
  effectiveDate: z.string().datetime('Invalid effective date format').optional(),
});

// Platform Settings
export const UpdatePlatformSettingsSchema = z.object({
  maxCallDuration: z.number().int().min(1, 'Max call duration must be at least 1 minute').optional(),
  minWalletBalance: z.number().int().min(0, 'Min wallet balance cannot be negative').optional(),
  maintenanceMode: z.boolean().optional(),
});

// Query Parameters
export const GetUsersQuerySchema = z.object({
  search: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional(),
  ...PaginationSchema.shape,
});

export const GetProfessionalsQuerySchema = z.object({
  search: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional(),
  isVerified: z.enum(['true', 'false']).optional(),
  ...PaginationSchema.shape,
});

export const GetCallsQuerySchema = z.object({
  status: z.enum(['CALL_INITIATED', 'CALL_START', 'CALL_END', 'CALL_REJECTED']).optional(),
  ...DateRangeSchema.partial().shape,
  ...PaginationSchema.shape,
});

// Type exports
export type AdminLoginRequest = z.infer<typeof AdminLoginSchema>;
export type AdminVerifyOtpRequest = z.infer<typeof AdminVerifyOtpSchema>;
export type UpdateUserWalletRequest = z.infer<typeof UpdateUserWalletSchema>;
export type UpdateProfessionalWalletRequest = z.infer<typeof UpdateProfessionalWalletSchema>;
export type VerifyProfessionalRequest = z.infer<typeof VerifyProfessionalSchema>;
export type UpdateProfessionalStatusRequest = z.infer<typeof UpdateProfessionalStatusSchema>;
export type UpdateUserStatusRequest = z.infer<typeof UpdateUserStatusSchema>;
export type UpdateProfessionalRatesRequest = z.infer<typeof UpdateProfessionalRatesSchema>;
export type DateRangeRequest = z.infer<typeof DateRangeSchema>;
export type UpdateCommissionRequest = z.infer<typeof UpdateCommissionSchema>;
export type UpdatePlatformSettingsRequest = z.infer<typeof UpdatePlatformSettingsSchema>;

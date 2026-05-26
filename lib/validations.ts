import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-zA-Z]/, 'Password must contain letters')
    .regex(/[0-9]/, 'Password must contain numbers'),
  nickname: z.string().min(2, 'Nickname must be 2-20 characters').max(20).optional(),
  code: z.string().length(6, 'Verification code must be 6 digits'),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

export const verifyEmailSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6, 'Verification code must be 6 digits'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z
    .string()
    .min(8)
    .regex(/[a-zA-Z]/)
    .regex(/[0-9]/),
});

export const translateSchema = z.object({
  text: z.string().min(1, 'Text is required').max(5000, 'Text exceeds 5000 character limit'),
  sourceLang: z.string().default('auto'),
  targetLang: z.string().min(2),
  mode: z.string().default('general'),
});

export const updateProfileSchema = z.object({
  nickname: z.string().min(2).max(20).optional(),
  avatarId: z.number().int().min(1).max(30).optional(),
  privacyMode: z.boolean().optional(),
});

export const exportSchema = z.object({
  format: z.enum(['json', 'csv', 'markdown']),
  ids: z.array(z.number()).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

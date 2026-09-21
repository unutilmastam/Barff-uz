import { z } from 'zod';
import { emailSchema, passwordSchema } from './primitives';

/** Kirish (CLAUDE.md §11: POST /auth/login). */
export const loginSchema = z.object({
  email: emailSchema,
  // Kirishda parol qoidalari tekshirilmaydi — faqat bo'sh emasligi.
  // Aks holda eski parolli foydalanuvchi kira olmay qoladi.
  password: z.string().min(1, { message: 'Parol kiritilishi shart' }),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, { message: 'Joriy parol kiritilishi shart' }),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Parollar mos kelmadi',
    path: ['confirmPassword'],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: 'Yangi parol eskisidan farq qilishi kerak',
    path: ['newPassword'],
  });

export type LoginInput = z.input<typeof loginSchema>;

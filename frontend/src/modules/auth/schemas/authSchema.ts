import { z } from "zod";

const forbiddenNames = ['admin', 'root'];

export const nameSchema = z.string()
  .min(1, "Nama tidak boleh kosong")
  .max(50, "Nama maksimal 50 karakter")
  .refine(
    (val) => !forbiddenNames.includes(val.toLowerCase().trim()),
    (val) => ({ message: `Nama "${val}" tidak diperbolehkan` })
  );

export const emailSchema = z.string()
  .min(1, "Email tidak boleh kosong")
  .max(70, "Email maksimal 70 karakter")
  .email("Format email tidak valid")
  .refine(
    (val) => {
      const localPart = val.split('@')[0]?.toLowerCase() || '';
      return !forbiddenNames.some(name => localPart.includes(name));
    },
    { message: 'Email tidak boleh mengandung kata "admin" atau "root"' }
  );

export const passwordSchema = z.string().superRefine((val, ctx) => {
  const missing: string[] = [];

  if (val.length < 8) missing.push('minimal 8 karakter');
  if (!/[A-Z]/.test(val)) missing.push('huruf besar');
  if (!/[a-z]/.test(val)) missing.push('huruf kecil');
  if (!/[0-9]/.test(val)) missing.push('angka');
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(val)) missing.push('karakter spesial');

  if (missing.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Kurang: ${missing.join(', ')}`,
    });
  }
});

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.string().min(1, "Email wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

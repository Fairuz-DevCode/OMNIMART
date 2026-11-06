import { z } from "zod";

const forbiddenNames = ["admin", "root"];

export const nameSchema = z
  .string()
  .min(1, "Nama tidak boleh kosong")
  .max(50, "Nama maksimal 50 karakter")
  .superRefine((val, ctx) => {
    const cleanVal = val.toLowerCase().trim();

    const forbiddenFound = forbiddenNames.find((forbidden) =>
      cleanVal.includes(forbidden)
    );

    if (forbiddenFound) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Nama tidak boleh mengandung kata ${forbiddenFound}`,
      });
    }
  });

export const emailSchema = z
  .string()
  .min(1, "Email tidak boleh kosong")
  .max(70, "Email maksimal 70 karakter")
  .email("Format email tidak valid")
  .superRefine((val, ctx) => {
    const localPart = val.split("@")[0]?.toLowerCase() || "";

    const forbiddenFound = forbiddenNames.find((forbidden) =>
      localPart.includes(forbidden)
    );

    if (forbiddenFound) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Email tidak boleh mengandung kata ${forbiddenFound}`,
      });
    }
  });

export const passwordSchema = z
  .string()
  .min(1, "Password tidak boleh kosong")
  .max(128, "Password maksimal 128 karakter")
  .superRefine((val, ctx) => {
    const missing: string[] = [];

    if (val.length < 8) missing.push("minimal 8 karakter");
    if (!/[A-Z]/.test(val)) missing.push("minimal 1 huruf besar");
    if (!/[a-z]/.test(val)) missing.push("minimal 1 huruf kecil");
    if (!/[0-9]/.test(val)) missing.push("minimal 1 angka");
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(val))
      missing.push("minimal 1 karakter spesial");

    if (missing.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Password harus : ${missing.join(", ")}`,
      });
    }
  });

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email tidak boleh kosong")
    .email("Format email tidak valid"),
  password: z
    .string()
    .min(1, "Password tidak boleh kosong"),
});

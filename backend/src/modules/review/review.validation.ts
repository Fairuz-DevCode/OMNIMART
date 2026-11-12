import { z } from "zod";

export const createReviewSchema = z.object({
  rating: z.coerce
    .number()
    .int()
    .min(1, "Rating minimal 1")
    .max(5, "Rating maksimal 5"),
  comment: z
    .string()
    .trim()
    .max(500, "Komentar maksimal 500 karakter")
    .optional(),
});

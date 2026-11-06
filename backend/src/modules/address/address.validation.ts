import { z } from "zod";

export const createAddressSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Label cannot be empty")
    .max(50, "Label is too long"),

  phone: z
    .string()
    .trim()
    .regex(/^[0-9]+$/, "Invalid phone number format")
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number is too long"),

  street_address: z
    .string()
    .trim()
    .min(5, "Street address is too short")
    .max(255, "Street address is too long"),

  city: z
    .string()
    .trim()
    .min(1, "City is required")
    .max(100, "City name is too long"),

  country: z
    .string()
    .trim()
    .min(1, "Country is required")
    .max(100, "Country name is too long"),

  postal_code: z
    .string()
    .trim()
    .regex(/^[0-9]{5}$/, "Postal code must be 5 digits"),
});

export const updateAddressSchema = createAddressSchema.partial();

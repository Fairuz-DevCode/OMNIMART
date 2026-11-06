import { z } from "zod";

export const addCartItemSchema = z.object({
  product_id: z
    .number()
    .int("Product ID is required and must be an integer"),
  product_variant_id: z
    .number()
    .int("Product variant ID is required and must be an integer"),
  quantity: z
    .number()
    .int("Quantity must be a positive integer")
    .positive("Quantity must be a positive integer"),
});

export const updateCartItemSchema = z.object({
  quantity: z
    .number()
    .int("Quantity must be a positive integer")
    .positive("Quantity must be a positive integer"),
});

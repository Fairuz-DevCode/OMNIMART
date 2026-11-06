import { z } from "zod";

export const createOrderSchema = z.object({
  address_id: z
    .number()
    .int("Address ID is required and must be an integer"),
  shipping_cost: z
    .number()
    .int("Shipping cost is required and must be a non-negative integer")
    .nonnegative("Shipping cost is required and must be a non-negative integer"),
});

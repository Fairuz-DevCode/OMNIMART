import { z } from "zod";

export const createPaymentSchema = z.object({
  order_id: z
    .number()
    .int("Order ID is required and must be an integer"),
  payment_type: z
    .string()
    .min(1, "Payment type is required"),
});

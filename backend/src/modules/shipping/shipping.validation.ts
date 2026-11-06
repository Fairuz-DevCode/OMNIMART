import { z } from "zod";

const validShippingStatuses = [
  "pending",
  "in_transit",
  "shipped",
  "out_for_delivery",
  "delivered",
  "failed",
];

export const updateShippingSchema = z.object({
  courier: z
    .string()
    .min(1, "Courier is required"),
  tracking_number: z
    .string()
    .min(1, "Tracking number is required"),
  shipping_status: z
    .string()
    .refine((val) => validShippingStatuses.includes(val), {
      message: "Invalid shipping status",
    }),
});

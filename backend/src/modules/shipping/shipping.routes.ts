import express from "express";
import { verifyAccessToken } from "../../middleware/authMiddleware.js";
import { verifyAdmin } from "../../middleware/adminMiddleware.js";
import { validate } from "../../middleware/validateMiddleware.js";
import { updateShippingSchema } from "./shipping.validation.js";
import { ShippingController } from "./shipping.controller.js";

const router = express.Router();

router.patch("/order/:orderId", verifyAccessToken, verifyAdmin, validate(updateShippingSchema), ShippingController.updateShipping);
router.get("/order/:orderId", verifyAccessToken, ShippingController.getShipping);
router.patch("/order/:orderId/complete", verifyAccessToken, ShippingController.completeOrder);
router.post("/calculate", ShippingController.calculateCost);

export default router;

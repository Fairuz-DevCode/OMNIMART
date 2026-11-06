import express from "express";
import { verifyAccessToken } from "../../middleware/authMiddleware.js";
import { validate } from "../../middleware/validateMiddleware.js";
import { createPaymentSchema } from "./payment.validation.js";
import { PaymentController } from "./payment.controller.js";

const router = express.Router();

router.post("/", verifyAccessToken, validate(createPaymentSchema), PaymentController.createPayment);
router.post("/notification", PaymentController.handleNotification);
router.get("/order/:orderId", verifyAccessToken, PaymentController.getPaymentByOrder);

export default router;

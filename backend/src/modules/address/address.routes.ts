import express from "express";
import { AddressController } from "./address.controller.js";
import { verifyAccessToken } from "../../middleware/authMiddleware.js";
import { validate } from "../../middleware/validateMiddleware.js";
import { createAddressSchema, updateAddressSchema } from "./address.validation.js";
import { checkDuplicateAddress } from "./address.middleware.js";

const router = express.Router();

router.use(verifyAccessToken);

router.post("/", validate(createAddressSchema), checkDuplicateAddress, AddressController.createAddress);
router.get("/", AddressController.getAddresses);
router.patch("/:id", validate(updateAddressSchema), checkDuplicateAddress, AddressController.updateAddress);
router.delete("/:id", AddressController.deleteAddress);

export default router;

import express from "express";

import * as authController from "../../controllers/authController.js";
import * as orderController from "../../controllers/orderController.js";

const router = express.Router();

router.use(authController.protect);
router.use(authController.restrictTo("admin"));

/**
 * PAYMENT SUCCESS
 */
router.post("/success", orderController.markPaymentSuccess);

/**
 * PAYMENT FAILED
 */
router.post("/failed", orderController.markPaymentFailed);

export default router;

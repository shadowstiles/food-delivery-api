import express from "express";

import * as authController from "../controllers/authController.js";
import * as paymentController from "../controllers/paymentController.js";

const router = express.Router();

// Gateway redirects/callback verification cannot rely on an app JWT.
router.route("/verify").get(paymentController.paymentCallback);

// Protect all routes after this middleware
router.use(authController.protect);

// create payment on gateway (server-side) and return payment link/reference to client.
router
  .route("/initiate")
  .post(authController.restrictTo("customer"), paymentController.initiatePayment);

// Legacy wallet verification is admin-only while customer wallets are disabled.
router
  .route("/verify-wallet")
  .get(authController.restrictTo("admin"), paymentController.paymentWalletCallback);

// Initiate Refund
router
  .route("/refund/:transactionId")
  .post(authController.restrictTo("admin"), paymentController.refundPayment);

export default router;

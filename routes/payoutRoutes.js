import express from "express";

import * as authController from "../controllers/authController.js";
import * as payoutController from "../controllers/payoutController.js";

const router = express.Router();

// ─────────────────────────────
// USER ROUTES
// ─────────────────────────────
router.use(authController.protect);

// vendor/rider requests withdrawal from settled available balance
router.post(
  "/request",
  authController.restrictTo("vendor", "rider", "admin"),
  payoutController.requestWithdrawal
);

// ─────────────────────────────
// ADMIN ROUTES
// ─────────────────────────────
router.use(authController.restrictTo("admin"));

// get all payouts
router.get("/", payoutController.getAllPayouts);

// get single payout
router.get("/:id", payoutController.getPayoutDetails);

// process payout
router.post("/:payoutId/process", payoutController.processPayout);

// retry failed payout
router.post("/:payoutId/retry", payoutController.retryPayout);

export default router;

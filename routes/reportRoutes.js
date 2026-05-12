import express from "express";

import * as authController from "../controllers/authController.js";
import * as reportController from "../controllers/reportController.js";

const router = express.Router();

// Protect all routes after this middleware andmake sure only admin has access
router.use(authController.protect, authController.restrictTo("admin"));

router.route("/walletActivities").get(reportController.getWalletActivity);

router.route("/transactions").get(reportController.getTransactionReport);
router.route("/refund").get(reportController.getRefundReport);
router.route("/:recipientId/payout").get(reportController.getPayoutReport);
router
  .route("/dailyCashFlow")
  .get(reportController.getDailyCashflowSummaryReport);
router.route("/:ownerId/settlement").get(reportController.getSettlementReport);

export default router;

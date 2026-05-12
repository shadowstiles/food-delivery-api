import express from "express";

import * as authController from "../controllers/authController.js";
import * as refundController from "../controllers/refundController.js";

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

router.route("/request").post(refundController.requestRefund);

router.use(authController.restrictTo("admin"));

router.route("/:orderId").get(refundController.getAllRefundRequest);

router.route("/:refundId/approve").post(refundController.approveRefund);

router.route("/:refundId/reject").post(refundController.rejectRefund);

// internal/admin endpoint to process generic refunds by transaction.reference or orderId
router.route("/process").post(refundController.processRefundByRefOrOrder);

export default router;
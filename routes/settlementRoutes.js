import express from "express";

import * as authController from "../controllers/authController.js";
import * as settlementController from "../controllers/settlementController.js";

const router = express.Router();

// Protect all routes after this middleware andmake sure only admin has access
router.use(authController.protect, authController.restrictTo("admin"));

// Get all settlemets
router.route("/").get(settlementController.getAllSettlements);
router
  .route("/vendors/generate")
  .get(settlementController.generateVendorSettlements);
router
  .route("/riders/generate")
  .get(settlementController.generateRiderSettlements);
router
  .route("/:settlementId/approve")
  .patch(settlementController.approveReadySettlement);
router
  .route("/release-due")
  .post(settlementController.releaseDuePendingSettlements);

// list settlements for owner (pagination)
router.route("/:ownerId").get(settlementController.getAllSettlementForUser);

export default router;

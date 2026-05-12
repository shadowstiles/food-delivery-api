import express from "express";

import cloudinaryRouter from "./cloudinaryRoutes.js";
import reviewRouter from "./reviewRoutes.js";
import * as authController from "../controllers/authController.js";
import * as riderController from "../controllers/riderController.js";

const router = express.Router();

// /api/categories/:id/products

// ================================
// 🔗 NESTED ROUTE: /riders/:riderId/reviews
//                  /riders/:riderId/files/upload
// ================================
router.use("/:riderId/reviews", reviewRouter);

// Documents (License, Registration, Insurance)
router.use("/onboarding/:riderId/files/upload", cloudinaryRouter);

// ================================
// 📍 GEO QUERY — Riders within radius
// ================================
router
  .route("/riders-within/:distance/center/:latlng/unit/:unit")
  .get(riderController.getRidersWithin);

// ================================
// 🟦 PUBLIC ROUTES
// ================================

// Create Rider Profile (user → rider)
router
  .route("/")
  .get(riderController.getAllRiders)
  .post(authController.protect, riderController.createRider);

// Get a rider profile
router.route("/:id").get(authController.protect, riderController.getRider);
router
  .route("/user/:id")
  .get(authController.protect, riderController.getRiderByUserId);

// ================================
// 🔐 PROTECTED ROUTES (Rider only)
// ================================
router.use(authController.protect);
router.use(authController.restrictTo("rider", "admin"));

// -------------------------------
// 📌 ONBOARDING ROUTES
// -------------------------------

// Vehicle Info
router.patch("/onboarding/nin", riderController.updateNIN);
router.patch("/onboarding/vehicle", riderController.updateVehicleInfo);

// Guarantors
router.patch("/onboarding/guarantors", riderController.addGuarantors);

// Next of Kin
router.patch("/onboarding/next-of-kin", riderController.addNextOfKin);

// Background Check
router.patch(
  "/onboarding/background-check",
  riderController.submitBackgroundCheck
);

// Training Completion
router.patch("/onboarding/training", riderController.completeTraining);

// Delivery Bag
router.patch("/onboarding/delivery-bag", riderController.updateDeliveryBag);

// -------------------------------
// 🟩 RIDER OPERATIONS
// -------------------------------

// Go online/offline/busy
router.patch("/availability", riderController.setAvailabilityStatus);

// Update Real-time Location
router.patch("/location", riderController.updateRiderLocation);

// other details (Bank, Rider & Car Details)
router.patch("/other-update", riderController.updateBankAndDocumentsData);

// Update own rider profile (patch)
router.patch("/:id", riderController.updateRider);

// Delete own profile
router.delete("/:id", riderController.deleteRider);

// ================================
// 🟥 ADMIN CONTROL ROUTES
// ================================
router.use(authController.restrictTo("admin"));

router.get("/rider/stats", riderController.getRiderDashboardStats);
router.patch(
  "/rider/background/:id",
  riderController.submitBackgroundCheckAdmin
);
router.patch("/rider/bag/:id", riderController.submitDeliveryBag);
router.patch("/rider/approve/:id", riderController.adminApproveRider);
router.patch("/rider/reject/:id", riderController.adminRejectRider);
router.patch("/rider/suspend/:id", riderController.adminSuspendRider);
router.patch("/rider/block/:id", riderController.adminBlockRider);

export default router;

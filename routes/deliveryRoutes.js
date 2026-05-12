import express from "express";

import * as authController from "../controllers/authController.js";
import * as deliveryController from "../controllers/deliveryController.js";

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

// Create new delivery (restaurant/admin)
router
  .route("/")
  .post(
    authController.restrictTo("vendor", "admin"),
    deliveryController.createDelivery
  );

// Assign rider
router
  .route("/:id/assign")
  .patch(
    authController.restrictTo("admin", "vendor"),
    deliveryController.assignRider
  );

// Update delivery status (rider/admin)
router
  .route("/:id/status")
  .patch(
    authController.restrictTo("rider", "admin"),
    deliveryController.updateDeliveryStatus
  );

// Get or Cancel delivery details
router
  .route("/:id")
  .get(deliveryController.getDelivery)
  .delete(
    authController.restrictTo("vendor", "admin"),
    deliveryController.cancelDelivery
  );

// Rider’s deliveries
router
  .route("/rider/:riderId")
  .get(
    authController.restrictTo("rider", "admin"),
    deliveryController.getRiderDeliveries
  );

export default router;

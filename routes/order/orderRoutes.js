import express from "express";

import * as authController from "../../controllers/authController.js";
import * as orderController from "../../controllers/orderController.js";

const router = express.Router();

// Protect all routes
router.use(authController.protect);
router.use(authController.restrictTo("customer", "admin"));

/**
 * CREATE ORDER
 */
router.post("/", orderController.createOrder);

/**
 * GET MY ORDERS
 */
router.get("/", orderController.getMyOrders);

/**
 * GET USER ORDERS
 */
router.get("/user/:userId", orderController.getUserOrders);

/**
 * GET SINGLE ORDER
 */
router.get("/:id", orderController.getOrder);

/**
 * GET SINGLE ORDER TRACKING
 */
router.get("/:id/track", orderController.trackOrder);

/**
 * CANCEL ORDER
 */
router.patch("/:id/cancel", orderController.cancelOrder);

/**
 * UPDATE ORDER STATUS
 */
router.patch("/:id/status", orderController.updateOrderStatus);

/**
 * GET ALL ORDERS (ADMIN)
 */
router.get("/admin/all", orderController.getAllOrder);

export default router;

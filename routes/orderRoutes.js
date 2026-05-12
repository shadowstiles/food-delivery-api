import express from "express";

import * as authController from "../controllers/authController.js";
import * as orderController from "../controllers/orderController.js";

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

// User places new order
router.route("/").post(orderController.createOrder);

// Get order details
router.route("/:id").get(orderController.getOrder);

// Cancel order details
router.route("/:orderId").delete(orderController.cancelOrder);

// User’s order history
router.route("/user/:userId").get(orderController.getUserOrders);

// Restaurant’s orders
router
  .route("/restaurant/:restaurantId")
  .get(
    authController.restrictTo("vendor", "admin"),
    orderController.getRestaurantOrders
  );

// USER cancels Restaurant order
// PATCH /api/v1/orders/:orderId/cancel
router
  .route("/:orderId/restaurant/:restaurantId/cancel")
  .patch(
    authController.restrictTo("user"),
    orderController.cancelRestaurantOrderByUser
  );

// Restaurant updates status for its part of the order
// PATCH /api/v1/orders/65ff9a74d8/restaurant/65ee33a8/status
router.route("/:orderId/restaurant/:restaurantId/status").patch(
  authController.restrictTo("vendor", "admin"), // restaurants or admin only
  orderController.updateRestaurantOrderStatus
);

// Rider’s assigned orders
// PATCH Rider’s orders decision
router
  .route("/rider/delivery/:deliveryId")
  .patch(
    authController.restrictTo("rider"),
    orderController.updateRidersChoice
  );
router
  .route("/rider/:riderId")
  .get(
    authController.restrictTo("rider", "admin"),
    orderController.getRiderOrders
  );

// Rider updates status for its part of the order
// PATCH /api/v1/orders/65ff9a74d8/rider/65ee33a8/status
router.route("/:orderId/rider/:riderId/status").patch(
  authController.restrictTo("rider", "admin"), // rider or admin only
  orderController.updateOrderStatusByRider
);

// Get all order details
router
  .route("/")
  .get(authController.restrictTo("admin"), orderController.getAllOrder);

// Update order status (restaurant/rider/admin)
router.route("/:id/status").patch(orderController.updateOrderStatus);

export default router;

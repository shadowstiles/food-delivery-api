import express from "express";

import * as authController from "../../controllers/authController.js";
import * as orderController from "../../controllers/orderController.js";

const router = express.Router();

router.use(authController.protect);
router.use(authController.restrictTo("vendor", "admin"));

/**
 * GET STORE ORDERS
 */
router.get("/", orderController.getStoreOrders);

/**
 * GET RESTAURANT ORDERS
 */
router.get("/restaurant/:restaurantId", orderController.getRestaurantOrders);

/**
 * ACCEPT ORDER
 */
router.patch("/:id/accept", orderController.acceptOrder);

/**
 * MARK PREPARING
 */
router.patch("/:id/preparing", orderController.markPreparing);

/**
 * UPDATE RESTAURANT ORDER STATUS
 */
router.patch(
  "/restaurant/:restaurantId/order/:orderId/status",
  orderController.updateRestaurantOrderStatus
);

/**
 * CANCEL RESTAURANT ORDER BY USER
 */
router.patch(
  "/restaurant/:restaurantId/order/:orderId/cancel",
  orderController.cancelRestaurantOrderByUser
);

export default router;

import express from "express";

import * as authController from "../../controllers/authController.js";
import * as orderController from "../../controllers/orderController.js";

const router = express.Router();

router.use(authController.protect);
router.use(authController.restrictTo("rider", "admin"));

/**
 * GET RIDER ORDERS
 */
router.get("/", orderController.getRiderOrders);

/**
 * UPDATE RIDER CHOICE
 */
router.patch(
  "/delivery/:deliveryId/choice",
  orderController.updateRidersChoice
);

/**
 * PICK ORDER
 */
router.patch("/:id/pick", orderController.markPicked);

/**
 * DELIVER ORDER
 */
router.patch("/:id/deliver", orderController.markDelivered);

/**
 * UPDATE ORDER STATUS BY RIDER
 */
router.patch(
  "/:riderId/orders/:orderId/status",
  orderController.updateOrderStatusByRider
);

export default router;

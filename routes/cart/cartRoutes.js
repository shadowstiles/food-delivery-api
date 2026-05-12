import express from "express";

import * as authController from "../../controllers/authController.js";
import * as cartController from "../../controllers/cartController.js";

const router = express.Router();

// Protect all routes
router.use(authController.protect);

/**
 * CART ROOT
 */
router
  .route("/")
  .get(cartController.getMyCart)
  .delete(cartController.clearCart);

/**
 * CART TOTALS
 */
router.get("/totals", cartController.getCartTotals);

/**
 * MERGE CART (guest → user)
 */
router.post("/merge", cartController.mergeCart);

router.post("/apply-coupon", cartController.applyCoupon);

router.post("/validate/:restaurantId", cartController.validateCart);

router.patch("/active-restaurant", cartController.setActiveRestaurant);

export default router;

import express from "express";

import * as authController from "../../controllers/authController.js";
import * as cartController from "../../controllers/cartController.js";

const router = express.Router();

router.use(authController.protect);

/**
 * CLEAR ONE RESTAURANT CART
 */
router.delete("/:restaurantId", cartController.clearRestaurantCart);

/**
 * UPDATE RESTAURANT NOTES
 */
router.patch("/:restaurantId/notes", cartController.updateRestaurantNotes);

export default router;

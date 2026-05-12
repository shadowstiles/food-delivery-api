import express from "express";

import * as authController from "../../controllers/authController.js";
import * as cartController from "../../controllers/cartController.js";

const router = express.Router();

router.use(authController.protect);

/**
 * ADD ITEM
 */
router.post("/", cartController.addToCart);

/**
 * UPDATE ITEM (quantity, notes, etc.)
 */
router.patch("/:itemId", cartController.updateCartItem);

/**
 * UPDATE ITEM NOTES
 */
router.patch("/:itemId/notes", cartController.updateItemNotes);

/**
 * REMOVE ITEM
 */
router.delete("/:itemId", cartController.removeCartItem);

export default router;

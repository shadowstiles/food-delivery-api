import express from "express";

import * as authController from "../controllers/authController.js";
import * as savedItemController from "../controllers/savedItemController.js";

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

// Save/favourite an item
router
  .route("/")
  .get(savedItemController.getSavedItems)
  .post(savedItemController.saveItem);

router.route("/restaurants").get(savedItemController.getSavedRestaurant);
router.route("/products").get(savedItemController.getSavedProducts);
router.route("/riders").get(savedItemController.getSavedRiders);

// Remove/unfavourite an item
router.route("/:itemId").delete(savedItemController.removeSavedItem);

export default router;

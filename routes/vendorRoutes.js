import express from "express";

import * as authController from "../controllers/authController.js";
import * as vendorController from "../controllers/vendorController.js";

export const router = express.Router();

router.use(authController.protect);

router
  .route("/")
  .get(authController.restrictTo("admin"), vendorController.getAllVendor)
  .post(authController.restrictTo("admin"), vendorController.createVendor);

router
  .route("/:id")
  .get(vendorController.getVendor)
  .patch(
    authController.restrictTo("vendor", "admin"),
    vendorController.updateVendor
  );

router
  .route("/delete")
  .delete(
    authController.restrictTo("vendor", "admin"),
    vendorController.deleteVendor
  );

export default router;

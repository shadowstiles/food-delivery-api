import express from "express";

import * as authController from "../controllers/authController.js";
import * as brandController from "../controllers/brandController.js";

export const router = express.Router();

router
  .route("/")
  .get(brandController.getAllBrand)
  .post(
    authController.protect,
    authController.restrictTo("admin"),
    brandController.createBrand
  );

router.use(authController.protect);

router
  .route("/:id")
  .get(brandController.getBrand)
  .patch(authController.restrictTo("admin"), brandController.updateBrand);

router
  .route("/delete")
  .delete(authController.restrictTo("admin"), brandController.deleteBrand);

export default router;

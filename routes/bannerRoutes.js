import express from "express";

import * as authController from "../controllers/authController.js";
import * as bannerController from "../controllers/bannerController.js";

export const router = express.Router();

router
  .route("/")
  .get(bannerController.getAllBanner)
  .post(
    authController.protect,
    authController.restrictTo("admin"),
    bannerController.createBanner
  );

router.use(authController.protect);

router
  .route("/:id")
  .get(bannerController.getBanner)
  .patch(authController.restrictTo("admin"), bannerController.updateBanner);

router
  .route("/delete")
  .delete(authController.restrictTo("admin"), bannerController.deleteBanner);

export default router;

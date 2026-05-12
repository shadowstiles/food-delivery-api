import express from "express";

import * as authController from "../controllers/authController.js";
import * as settingsController from "../controllers/platformSettingsController.js";

export const router = express.Router();

router
  .route("/")
  .get(settingsController.getAllSetting)
  .post(
    authController.protect,
    authController.restrictTo("admin"),
    settingsController.createSetting
  );

router.use(authController.protect);

router
  .route("/:id")
  .get(settingsController.getSetting)
  .patch(authController.restrictTo("admin"), settingsController.updateSetting);

router
  .route("/delete")
  .delete(authController.restrictTo("admin"), settingsController.deleteSetting);

export default router;

import express from "express";

import * as authController from "../controllers/authController.js";
import * as dashboardController from "../controllers/dashboardController.js";

export const router = express.Router();

router.route("/").get(dashboardController.getUserAppDashboard);
router.route("/search").get(dashboardController.globalSearch);

router
  .route("/admin")
  .post(
    authController.protect,
    authController.restrictTo("admin"),
    dashboardController.getAdminDashboard
  );

router
  .route("/vendor")
  .post(
    authController.protect,
    authController.restrictTo("vendor"),
    dashboardController.getVendorDashboard
  );

export default router;

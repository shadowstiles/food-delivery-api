import express from "express";

import * as adminController from "../controllers/adminController.js";
import * as authController from "../controllers/authController.js";

export const router = express.Router();

router.use(authController.protect);
router.use(authController.restrictTo("admin"));

router
  .route("/")
  .get(adminController.getAllAdmin)
  .post(
    authController.restrictAdminToLevels("superadmin"),
    adminController.createAdmin
  );

router
  .route("/:id")
  .get(adminController.getAdmin)
  .patch(
    authController.restrictAdminToLevels("superadmin"),
    adminController.updateAdmin
  );

router
  .route("/delete")
  .delete(
    authController.restrictAdminToLevels("superadmin"),
    adminController.deleteAdmin
  );

export default router;

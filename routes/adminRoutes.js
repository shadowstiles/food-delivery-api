import express from "express";

import * as adminController from "../controllers/adminController.js";
import * as authController from "../controllers/authController.js";

const router = express.Router();

//
// BOOTSTRAP
//
if (process.env.ALLOW_BOOTSTRAP === "true") {
  router.post("/bootstrap/superadmin", adminController.bootstrapPlatform);
}

//
// PROTECTED ROUTES
//
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
  )
  .delete(
    authController.restrictAdminToLevels("superadmin"),
    adminController.deleteAdmin
  );

export default router;

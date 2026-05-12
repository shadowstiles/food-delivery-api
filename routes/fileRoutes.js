import express from "express";

import * as authController from "../controllers/authController.js";
import * as fileController from "../controllers/fileController.js";

const router = express.Router();

router.use(authController.protect);

router.route("/:ownerId").get(fileController.getUserFilesByPurpose);

router
  .route("/purpose/:purpose")
  .get(
    authController.restrictTo("admin", "vendor"),
    fileController.getAllFilesByPurpose
  );

// Protect all routes and only admin can access this after this middleware
router.use(authController.restrictTo("admin"));

router.route("/soft-delete").post(fileController.softDelete);
router.route("/restore").post(fileController.restore);

export default router;

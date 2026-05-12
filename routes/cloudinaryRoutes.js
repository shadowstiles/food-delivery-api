import express from "express";
import multer from "multer";

import * as authController from "../controllers/authController.js";
import * as cloudinaryController from "../controllers/cloudinaryController.js";

const router = express.Router({ mergeParams: true });
const upload = multer({ storage: multer.memoryStorage() });

// Protect all routes after this middleware
router.use(authController.protect);

router
  .route("/upload")
  .post(upload.single("file"), cloudinaryController.upload);

router
  .route("/upload-admin-vendor")
  .post(upload.single("file"), cloudinaryController.uploadAdminVendor);

router
  .route("/bulk-upload")
  .post(
    authController.restrictTo("vendor", "admin"),
    upload.array("files", 10),
    cloudinaryController.bulkUpload
  );

router.route("/download").post(cloudinaryController.download);

router.route("/delete").delete(cloudinaryController.deleteOne);

router
  .route("/list")
  .post(
    authController.restrictTo("vendor", "admin"),
    cloudinaryController.listAll
  );

export default router;

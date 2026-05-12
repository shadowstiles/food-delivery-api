import express from "express";
import multer from "multer";

import * as authController from "../controllers/authController.js";
import * as awsS3Controller from "../controllers/awsS3Controller.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Protect all routes after this middleware
router.use(authController.protect);

router.route("/upload").post(upload.single("file"), awsS3Controller.upload);

router.route("/download").post(awsS3Controller.download);

router
  .route("/bulk-upload")
  .post(
    authController.restrictTo("vendor", "admin"),
    upload.array("files", 10),
    awsS3Controller.bulkUpload
  );

router.route("/download").post(awsS3Controller.download);

router.route("/delete").delete(awsS3Controller.deleteOne);

router
  .route("/list")
  .post(authController.restrictTo("vendor", "admin"), awsS3Controller.listAll);

export default router;

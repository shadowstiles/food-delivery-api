import express from "express";

import * as authController from "../controllers/authController.js";
import * as locationController from "../controllers/locationController.js";

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

router.route("/").post(locationController.addLocation);

router.route("/:userId").get(locationController.getUsersLocations);

router
  .route("/:locationId")
  .patch(locationController.updateLocation)
  .delete(locationController.deleteLocation);

export default router;

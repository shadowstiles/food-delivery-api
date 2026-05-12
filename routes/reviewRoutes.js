import express from "express";

import * as authController from "../controllers/authController.js";
import * as reviewController from "../controllers/reviewController.js";

export const router = express.Router({ mergeParams: true });

router
  .route("/")
  .get(reviewController.getAllReview)
  .post(
    authController.protect,
    authController.restrictTo("user"),
    reviewController.setProductUserIds,
    reviewController.setRestaurantUserIds,
    reviewController.setProductUserIds,
    reviewController.createReview
  );

router.use(authController.protect);
router
  .route("/recalcAllRatings")
  .get(authController.restrictTo("admin"), reviewController.recalcAllRatings);

router.route("/:orderId").get(reviewController.getReviews);

router
  .route("/:id")
  .patch(
    authController.restrictTo("user", "admin"),
    reviewController.updateReview
  )
  .delete(
    authController.restrictTo("user", "admin"),
    reviewController.deleteReview
  );

export default router;

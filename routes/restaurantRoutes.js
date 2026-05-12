import express from "express";

import productRouter from "./productRoutes.js";
import reviewRouter from "./reviewRoutes.js";
import * as authController from "../controllers/authController.js";
import * as restaurantController from "../controllers/restaurantController.js";

export const router = express.Router();

router.use("/:restaurantId/reviews", reviewRouter);
router.use("/:restaurantId/products", productRouter);

router
  .route("/top-5-highest-rated-restaurant")
  .get(
    restaurantController.aliasHighestRatedRestaurant,
    restaurantController.getAllRestaurants
  );

router
  .route("/restaurants-within/:distance/center/:latlng/unit/:unit")
  .get(restaurantController.getRestaurantsWithin);

router
  .route("/distances/:latlng/unit/:unit")
  .get(restaurantController.getDistances);

router
  .route("/")
  .get(restaurantController.getAllRestaurants)
  .post(
    authController.protect,
    authController.restrictTo("admin", "vendor"),
    restaurantController.createRestaurant
  );

router
  .route("/vendor/:vendorId")
  .get(restaurantController.getAllVendorRestaurants);

router
  .route("/:id")
  .get(restaurantController.getRestaurant)
  .patch(
    authController.protect,
    authController.restrictTo("admin", "vendor"),
    restaurantController.updateRestaurant
  )
  .delete(
    authController.protect,
    authController.restrictTo("admin", "vendor"),
    restaurantController.deleteRestaurant
  );

export default router;

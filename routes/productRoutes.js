import express from "express";

import reviewRouter from "./reviewRoutes.js";
import * as authController from "../controllers/authController.js";
import * as productController from "../controllers/productController.js";

export const router = express.Router({ mergeParams: true });

router.use("/:productId/reviews", reviewRouter);

router
  .route("/top-5-main-dish")
  .get(productController.aliasMainDish, productController.getAllProducts);

router
  .route("/")
  .get(productController.getAllProducts)
  .post(
    authController.protect,
    authController.restrictTo("admin", "vendor"),
    productController.setCategoryId,
    productController.createProduct
  );

router.route("/:restaurantIds").get(productController.getAllProducts);

router
  .route("/:id")
  .get(productController.getProduct)
  .patch(
    authController.protect,
    authController.restrictTo("admin", "vendor"),
    productController.updateProduct
  )
  .delete(
    authController.protect,
    authController.restrictTo("admin", "vendor"),
    productController.deleteProduct
  );

export default router;

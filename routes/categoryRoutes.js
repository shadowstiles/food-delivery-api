import express from "express";

import productRouter from "./productRoutes.js";
import * as authController from "../controllers/authController.js";
import * as categoryController from "../controllers/categoryController.js";

const router = express.Router();

// /api/categories/:id/products
router.use("/:categoryId/products", productRouter);

router
  .route("/")
  .get(categoryController.getCategories)
  .post(
    authController.protect,
    authController.restrictTo("admin"),
    categoryController.createCategory
  );

router.route("/top").get(categoryController.getTopCategoriesByProductCount);
router.route("/featured").get(categoryController.getFeaturedCategories);
router.route("/highlights").get(categoryController.getCategoryHighlights);

router
  .route("/:id")
  .get(categoryController.getCategory)
  .patch(
    authController.protect,
    authController.restrictTo("admin"),
    categoryController.updateCategory
  );

router
  .route("/delete")
  .delete(
    authController.protect,
    authController.restrictTo("admin"),
    categoryController.deleteCategory
  );

router.use(authController.protect);
router.use(authController.restrictTo("admin"));

router.route("/:id/restore").patch(categoryController.restoreCategory);
router.route("/:id/image").post(categoryController.uploadCategoryImage);
router.route("/bulk").post(categoryController.createMultipleCategories);

export default router;

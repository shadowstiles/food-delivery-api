import * as factory from "./handlerFactory.js";
import Category from "../models/categoryModel.js";
import Product from "../models/productModel.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

// Create
export const createCategory = factory.createOne(Category);

// Get all
export const getCategories = factory.getAll({ Model: Category });

// Get one
export const getCategory = factory.getOne(Category, "category", {
  path: "products",
  select: "-__v",
});

// Update
export const updateCategory = factory.updateOne(Category);

// delete
export const deleteCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findByIdAndDelete(req.body.categoryId);

  if (!category) {
    return next(new AppError(`No category found with that ID`, 404));
  }

  res.status(204).json({ status: "success" });
});

// Soft delete
export const softDeleteCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );

  if (!category) {
    return next(new AppError(`No category found with that ID`, 404));
  }

  res.status(204).json({
    status: "success",
    message: "Category deactivated",
  });
});

// Restore
export const restoreCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findByIdAndUpdate(
    req.params.id,
    { isActive: true },
    { new: true }
  );

  if (!category) {
    return next(new AppError(`No category found with that ID`, 404));
  }

  res.status(200).json({ status: "success", data: { category } });
});

// Upload/Update image
export const uploadCategoryImage = async (req, res) => {
  // Assume req.file contains uploaded image from middleware
  const imageUrl = req.fileUrl; // depends on your upload logic
  const category = await Category.findByIdAndUpdate(
    req.params.id,
    { image: imageUrl },
    { new: true }
  );
  res.json({ success: true, message: "Image updated", data: category });
};

//   Create multiple categories
export const createMultipleCategories = catchAsync(async (req, res, next) => {
  const { categories } = req.body;

  if (!Array.isArray(categories) || categories.length === 0) {
    return res.status(400).json({ message: "Categories array is required" });
  }

  // 🔹 Normalize names to lowercase before insertion
  const normalizedCategories = categories.map((cat) => ({
    ...cat,
    name: cat.name.toLowerCase(),
  }));

  // 🔹 Insert many documents at once
  const createdCategories = await Category.insertMany(normalizedCategories, {
    ordered: false, // continue inserting even if some fail
  });

  res.status(201).json({
    status: "success",
    message: "Categories created successfully",
    data: { createdCategories },
  });
});

//    Top categories by product count
export const getTopCategoriesByProductCount = catchAsync(
  async (req, res, next) => {
    const categories = await Product.aggregate([
      { $group: { _id: "$category", productCount: { $sum: 1 } } },
      { $sort: { productCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      {
        $project: {
          _id: "$category._id",
          name: "$category.name",
          image: "$category.image",
          description: "$category.description",
          productCount: 1,
        },
      },
    ]);

    res.status(200).json({ status: "success", data: { categories } });
  }
);

//    Featured categories (picked by admin)
export const getFeaturedCategories = catchAsync(async (req, res, next) => {
  const categories = await Category.find({ isFeatured: true, isActive: true })
    .sort({ priority: -1 })
    .limit(7);

  res.status(200).json({ status: "success", data: categories });
});

//    Combined response: Trending (by product count) + Featured
export const getCategoryHighlights = catchAsync(async (req, res, next) => {
  // trending by product count
  const trending = await Product.aggregate([
    { $group: { _id: "$category", productCount: { $sum: 1 } } },
    { $sort: { productCount: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: "categories",
        localField: "_id",
        foreignField: "_id",
        as: "category",
      },
    },
    { $unwind: "$category" },
    {
      $project: {
        _id: "$category._id",
        name: "$category.name",
        image: "$category.image",
        description: "$category.description",
        productCount: 1,
      },
    },
  ]);

  // featured by admin
  const featured = await Category.find({ isFeatured: true, isActive: true })
    .sort({ priority: -1 })
    .limit(5);

  res.status(200).json({ status: "success", trending, featured });
});

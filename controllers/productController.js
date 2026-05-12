import Product from "../models/productModel.js";
import Vendor from "../models/vendorModel.js";
import APIFeatures from "../utils/apiFeatures.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

export const aliasMainDish = async (req, res, next) => {
  const limit = 5;
  const sort = "-ratingsAverage,price";

  req.queryParams = { ...req.query, limit, sort };

  next();
};

export const setCategoryId = (req, res, next) => {
  // Allow nested routes
  if (!req.body.category) req.body.category = req.params.categoryId;

  next();
};

export const getAllProducts = catchAsync(async (req, res, next) => {
  let filter = {};

  if (req.params.productId) {
    filter = { product: req.params.productId };
  }

  if (req.params.categoryId) {
    filter = { category: req.params.categoryId };
  }

  if (req.params.restaurantId) {
    filter = { restaurant: req.params.restaurantId };
  }

  if (req.query.categories) {
    const categoryIds = req.query.categories?.split(",") || [];

    filter = { category: { $in: categoryIds } };
  }

  const features = new APIFeatures(
    Product.find(filter),
    req.queryParams || req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const products = await features.query;

  // SEND RESPONSE
  res.status(200).json({
    status: "success",
    results: products.length,
    data: { data: products },
  });
});

export const getProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id).populate({
    path: "restaurant",
    consselect: "-__v",
  });

  if (!product) {
    return next(new AppError(`No Product found with that ID`, 404));
  }

  res.status(200).json({
    status: "success",
    data: { data: product },
  });
});

async function assertVendorOwnsRestaurant(req, restaurantId, next) {
  if (req.user.role === "admin") return true;

  const vendor = await Vendor.findOne({ authId: req.user.id }).select(
    "restaurants"
  );

  const ownsRestaurant = vendor?.restaurants?.some(
    (id) => id.toString() === restaurantId?.toString()
  );

  if (!ownsRestaurant) {
    return next(
      new AppError("You cannot manage products for this restaurant", 403)
    );
  }

  return true;
}

export const createProduct = catchAsync(async (req, res, next) => {
  const authorized = await assertVendorOwnsRestaurant(
    req,
    req.body.restaurant,
    next
  );
  if (!authorized) return;

  const product = await Product.create(req.body);
  await product.populate([
    { path: "restaurant", select: "coverImage name distance email location" },
    { path: "category", select: "name" },
  ]);

  res.status(201).json({
    status: "success",
    data: { data: product },
  });
});

export const updateProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id)
    .select("restaurant")
    .setOptions({ skipProductHooks: true });

  if (!product) return next(new AppError("No product found with that ID", 404));

  const authorized = await assertVendorOwnsRestaurant(
    req,
    product.restaurant._id,
    next
  );
  if (!authorized) return;

  if (req.body.restaurant) {
    const canMove = await assertVendorOwnsRestaurant(
      req,
      req.body.restaurant,
      next
    );
    if (!canMove) return;
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    status: "success",
    data: { data: updatedProduct },
  });
});

export const deleteProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id)
    .select("restaurant")
    .setOptions({ skipProductHooks: true });

  if (!product) return next(new AppError("No product found with that ID", 404));

  const authorized = await assertVendorOwnsRestaurant(
    req,
    product.restaurant._id,
    next
  );
  if (!authorized) return;

  await Product.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: "success",
    data: null,
  });
});

export const getProductStats = catchAsync(async (req, res, next) => {
  const stats = await Product.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: { $toUpper: "$category" },
        totalProducts: { $sum: 1 },
        avgPrice: { $avg: "$price" },
        minPrice: { $min: "$price" },
        maxPrice: { $max: "$price" },
      },
    },
    {
      $sort: { avgPrice: 1 },
    },
  ]);

  res.status(200).json({
    status: "success",
    data: { stats },
  });
});

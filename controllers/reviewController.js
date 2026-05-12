import * as factory from "./handlerFactory.js";
import Review from "../models/reviewModel.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

export const setProductUserIds = (req, res, next) => {
  // Allow nested routes
  if (!req.body.product) req.body.product = req.params.productId;
  if (!req.body.user) req.body.user = req.user.id;

  next();
};

export const setRestaurantUserIds = (req, res, next) => {
  // Allow nested routes
  if (!req.body.restaurant) req.body.restaurant = req.params.restaurantId;
  if (!req.body.user) req.body.user = req.user.id;

  next();
};

export const setRiderUserIds = (req, res, next) => {
  // Allow nested routes
  if (!req.body.rider) req.body.rider = req.params.riderId;
  if (!req.body.user) req.body.user = req.user.id;

  next();
};

export const getAllReview = factory.getAll({ Model: Review });
export const createReview = factory.createOne(Review);
export const updateReview = factory.updateOne(Review, "review");
export const deleteReview = factory.deleteOne(Review, "review");

export const getReviews = catchAsync(async (req, res, next) => {
  const reviews = await Review.find({ order: req.params.orderId });

  if (!reviews) {
    return next(new AppError(`No review found for this order`, 404));
  }

  res.status(200).json({
    status: "success",
    data: { data: reviews },
  });
});

export const recalcAllRatings = catchAsync(async (req, res, next) => {
  // Define all entity types we want to recalc
  const entityTypes = ["Rider", "Product", "Restaurant"];

  let totalCount = 0;

  // eslint-disable-next-line no-restricted-syntax
  for (const type of entityTypes) {
    // Get all entityIds that have reviews of this type
    // eslint-disable-next-line no-await-in-loop
    const entityIds = await Review.distinct("entityId", { entityType: type });

    totalCount += entityIds.length;

    // Recalculate ratings for all entities of this type
    // Use Promise.all to run in parallel for performance
    // eslint-disable-next-line no-await-in-loop
    await Promise.all(
      entityIds.map((id) => Review.calcAverageRatings(type, id))
    );
  }

  res.status(200).json({
    status: "success",
    message: "Recalculated ratings for all entities",
    totalEntities: totalCount,
  });
});

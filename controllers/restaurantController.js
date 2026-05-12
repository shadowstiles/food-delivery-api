import * as factory from "./handlerFactory.js";
import Restaurant from "../models/restaurantModel.js";
import Vendor from "../models/vendorModel.js";
import APIFeatures from "../utils/apiFeatures.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

export const aliasHighestRatedRestaurant = async (req, res, next) => {
  const limit = 5;
  const status = "active";
  const sort = "-ratingsAverage,price";

  req.queryParams = { ...req.query, limit, status, sort };

  next();
};

export const getAllRestaurants = factory.getAll({ Model: Restaurant });

async function getVendorProfile(authId) {
  return Vendor.findOne({ authId }).select("_id restaurants");
}

async function assertRestaurantOwner(req, restaurantId, next) {
  if (req.user.role === "admin") return true;

  const vendor = await getVendorProfile(req.user.id);
  const ownsRestaurant = vendor?.restaurants?.some(
    (id) => id.toString() === restaurantId?.toString()
  );

  if (!ownsRestaurant) {
    return next(new AppError("You cannot manage this restaurant", 403));
  }

  return true;
}

export const getAllVendorRestaurants = catchAsync(async (req, res, next) => {
  const { vendorId } = req.params;

  const features = new APIFeatures(
    Restaurant.find({ owner: vendorId }),
    req.queryParams || req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const restaurants = await features.query;

  // SEND RESPONSE
  res.status(200).json({
    status: "success",
    results: restaurants.length,
    data: { data: restaurants },
  });
});

export const getRestaurant = factory.getOne(Restaurant, "Restaurant", {
  path: "products",
  select: "_id,category",
});

export const createRestaurant = catchAsync(async (req, res, next) => {
  if (req.user.role !== "admin") {
    const vendor = await getVendorProfile(req.user.id);
    if (!vendor) return next(new AppError("Vendor profile not found", 404));
    req.body.owner = vendor._id;
  }

  const restaurant = await Restaurant.create(req.body);

  await Vendor.findByIdAndUpdate(restaurant.owner, {
    $addToSet: { restaurants: restaurant._id },
  });

  res.status(201).json({
    status: "success",
    data: { data: restaurant },
  });
});

export const updateRestaurant = catchAsync(async (req, res, next) => {
  const authorized = await assertRestaurantOwner(req, req.params.id, next);
  if (!authorized) return;

  delete req.body.owner;
  delete req.body.wallet;

  const restaurant = await Restaurant.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!restaurant) {
    return next(new AppError("No Restaurant found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: { data: restaurant },
  });
});

export const deleteRestaurant = catchAsync(async (req, res, next) => {
  const authorized = await assertRestaurantOwner(req, req.params.id, next);
  if (!authorized) return;

  const restaurant = await Restaurant.findByIdAndDelete(req.params.id);

  if (!restaurant) {
    return next(new AppError("No Restaurant found with that ID", 404));
  }

  await Vendor.findByIdAndUpdate(restaurant.owner, {
    $pull: { restaurants: restaurant._id },
  });

  res.status(204).json({
    status: "success",
    data: null,
  });
});

export const getRestaurantStats = catchAsync(async (req, res, next) => {
  const stats = await Restaurant.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: { $toUpper: "$status" },
        totalRestaurants: { $sum: 1 },
        totalRatings: { $sum: "$ratingsQuantity" },
        avgRating: { $avg: "$ratingsAverage" },
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

// restaurants-within/:distance/center/:latlng/unit/:unit
// restaurants-within/233/center/-40,45/unit/mi
export const getRestaurantsWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(",");

  const radius = unit === "mi" ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    next(
      new AppError(
        "Please provide latitude and longitude in the format lat,lng.",
        400
      )
    );
  }

  const restaurants = await Restaurant.find({
    location: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  res.status(200).json({
    status: "success",
    results: restaurants.length,
    data: { data: restaurants },
  });
});

export const getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(",");

  const multiplier = unit === "mi" ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    next(
      new AppError(
        "Please provide latitude and longitude in the format lat,lng.",
        400
      )
    );
  }

  const distances = await Restaurant.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: "distance",
        distanceMultiplier: multiplier,
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        distance: 1,
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    data: { data: distances },
  });
});

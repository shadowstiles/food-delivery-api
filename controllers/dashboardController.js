import mongoose from "mongoose";

import Banner from "../models/bannerModel.js";
import CartItem from "../models/cartModel.js";
import Category from "../models/categoryModel.js";
import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";
import Restaurant from "../models/restaurantModel.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

const diffInDays = (start, end) =>
  Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;

export const getDateRangeWithPrevious = ({ range, startDate, endDate }) => {
  let currentStart;
  let currentEnd;

  // ===============================
  // CURRENT RANGE
  // ===============================

  if (range === "custom" && startDate && endDate) {
    currentStart = new Date(startDate);
    currentStart.setHours(0, 0, 0, 0);

    currentEnd = new Date(endDate);
    currentEnd.setHours(23, 59, 59, 999);
  } else {
    currentEnd = new Date();
    currentEnd.setHours(23, 59, 59, 999);

    currentStart = new Date();

    switch (range) {
      case "today":
        currentStart.setHours(0, 0, 0, 0);
        break;

      case "7d":
        currentStart.setDate(currentEnd.getDate() - 6);
        currentStart.setHours(0, 0, 0, 0);
        break;

      case "30d":
        currentStart.setDate(currentEnd.getDate() - 29);
        currentStart.setHours(0, 0, 0, 0);
        break;

      default:
        if (range?.endsWith("d")) {
          const days = parseInt(range.replace("d", ""), 10);
          currentStart.setDate(currentEnd.getDate() - (days - 1));
          currentStart.setHours(0, 0, 0, 0);
        } else {
          // safe default
          currentStart.setDate(currentEnd.getDate() - 6);
          currentStart.setHours(0, 0, 0, 0);
        }
    }
  }

  // ===============================
  // PREVIOUS RANGE
  // ===============================

  const rangeLength = diffInDays(currentStart, currentEnd);

  const previousEnd = new Date(currentStart.getTime() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - (rangeLength - 1));
  previousStart.setHours(0, 0, 0, 0);

  return {
    current: {
      start: currentStart,
      end: currentEnd,
    },
    previous: {
      start: previousStart,
      end: previousEnd,
    },
  };
};

export const getAdminDashboard = catchAsync(async (req, res, next) => {
  const { range, startDate, endDate } = req.body;

  // Validate range and restaurantIds
  if (!range || (range === "custom" && !startDate && !endDate)) {
    return next(new AppError("Invalid request", 400));
  }

  const {
    current: { start: currentStart, end: currentEnd },
    previous: { start: previousStart, end: previousEnd },
  } = getDateRangeWithPrevious({ range, startDate, endDate });

  const adminDashboardData = await Order.aggregate([
    // ---------------------
    // KPIs Current Period
    // ---------------------
    {
      $facet: {
        currentKpis: [
          {
            $match: { createdAt: { $gte: currentStart, $lte: currentEnd } },
          },
          {
            $group: {
              _id: null,
              orderIds: { $addToSet: "$_id" },
              deliveredOrders: {
                $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] },
              },
              restaurantIds: {
                $addToSet: "$storeId",
              },
              restaurantCommission: {
                $sum: "$restaurantFinance.commissionAmount",
              },
              deliveryCommission: { $sum: "$deliveryFinance.platformEarning" },
            },
          },
          {
            $project: {
              _id: 0,
              totalOrders: { $size: "$orderIds" },
              activeRestaurants: {
                $size: {
                  $filter: {
                    input: "$restaurantIds",
                    as: "id",
                    cond: { $ne: ["$$id", null] },
                  },
                },
              },
              revenue: {
                $add: ["$restaurantCommission", "$deliveryCommission"],
              },
              successRate: {
                $cond: [
                  { $eq: [{ $size: "$orderIds" }, 0] },
                  0,
                  {
                    $multiply: [
                      { $divide: ["$deliveredOrders", { $size: "$orderIds" }] },
                      100,
                    ],
                  },
                ],
              },
            },
          },
        ],

        // ---------------------
        // KPIs Previous Period
        // ---------------------
        previousKpis: [
          {
            $match: { createdAt: { $gte: previousStart, $lte: previousEnd } },
          },
          {
            $group: {
              _id: null,
              orderIds: { $addToSet: "$_id" },
              deliveredOrders: {
                $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] },
              },
              restaurantIds: {
                $addToSet: "$storeId",
              },
              restaurantCommission: {
                $sum: "$restaurantFinance.commissionAmount",
              },
              deliveryCommission: { $sum: "$deliveryFinance.platformEarning" },
            },
          },
          {
            $project: {
              _id: 0,
              totalOrders: { $size: "$orderIds" },
              activeRestaurants: {
                $size: {
                  $filter: {
                    input: "$restaurantIds",
                    as: "id",
                    cond: { $ne: ["$$id", null] },
                  },
                },
              },
              revenue: {
                $add: ["$restaurantCommission", "$deliveryCommission"],
              },
              successRate: {
                $cond: [
                  { $eq: [{ $size: "$orderIds" }, 0] },
                  0,
                  {
                    $multiply: [
                      { $divide: ["$deliveredOrders", { $size: "$orderIds" }] },
                      100,
                    ],
                  },
                ],
              },
            },
          },
        ],

        // ---------------------
        // Orders Trend
        // ---------------------
        ordersTrend: [
          { $match: { createdAt: { $gte: currentStart, $lte: currentEnd } } },
          {
            $group: {
              _id: {
                date: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { "_id.date": 1 } },
          { $project: { _id: 0, date: "$_id.date", count: 1 } },
        ],

        // ---------------------
        // Revenue Trend
        // ---------------------
        revenueTrend: [
          {
            $match: {
              createdAt: { $gte: currentStart, $lte: currentEnd },
              status: "delivered",
            },
          },
          {
            $group: {
              _id: {
                date: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                },
              },
              amount: {
                $sum: {
                  $add: [
                    "$restaurantFinance.commissionAmount",
                    "$deliveryFinance.platformEarning",
                  ],
                },
              },
            },
          },
          { $sort: { "_id.date": 1 } },
          { $project: { _id: 0, date: "$_id.date", amount: 1 } },
        ],

        // ---------------------
        // Order Status Summary
        // ---------------------
        orderStatusSummary: [
          { $match: { createdAt: { $gte: currentStart, $lte: currentEnd } } },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ],

        // ---------------------
        // Recent Orders
        // ---------------------
        recentOrders: [
          { $sort: { createdAt: -1 } },
          { $limit: 10 },
          {
            $project: {
              _id: 1,
              orderNumber: 1,
              status: 1,
              itemsCount: {
                $cond: [{ $isArray: "$items" }, { $size: "$items" }, 0],
              },
              totalPrice: "$total",
              createdAt: 1,
            },
          },
        ],

        // ---------------------
        // Recent Transactions
        // ---------------------
        recentTransactions: [
          {
            $lookup: {
              from: "transactions",
              localField: "_id",
              foreignField: "order",
              as: "transaction",
            },
          },

          {
            $unwind: {
              path: "$transaction",
              preserveNullAndEmptyArrays: false,
            },
          },

          {
            $match: {
              "transaction.status": "paid",
            },
          },

          { $sort: { "transaction.createdAt": -1 } },
          { $limit: 10 },

          {
            $project: {
              _id: 1,
              transactionId: "$transaction.reference",
              status: "$transaction.status",
              paymentMethod: "$transaction.paymentMethod",
              amount: "$transaction.amount",
              createdAt: "$transaction.createdAt",

              orderId: "$orderNumber",
            },
          },
        ],
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    data: { data: adminDashboardData },
  });
});

export const getVendorDashboard = catchAsync(async (req, res, next) => {
  const { range, startDate, endDate, vendorRestaurantIds } = req.body;

  // Validate range and restaurantIds
  if (
    !range ||
    (range === "custom" && !startDate && !endDate) ||
    !Array.isArray(vendorRestaurantIds) ||
    vendorRestaurantIds.length === 0
  ) {
    return next(new AppError("Invalid request", 400));
  }

  const {
    current: { start: currentStart, end: currentEnd },
    previous: { start: previousStart, end: previousEnd },
  } = getDateRangeWithPrevious({ range, startDate, endDate });
  const restaurantObjectIds = vendorRestaurantIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (restaurantObjectIds.length === 0) {
    return next(new AppError("Invalid restaurant ids", 400));
  }

  const vendorDashboardData = await Order.aggregate([
    // ---------------------
    // Filter by vendor restaurants
    // ---------------------
    {
      $match: {
        storeId: { $in: restaurantObjectIds },
      },
    },

    {
      $facet: {
        // ---------------------
        // KPIs Current Period
        // ---------------------
        currentKpis: [
          { $match: { createdAt: { $gte: currentStart, $lte: currentEnd } } },
          {
            $group: {
              _id: null,
              orderIds: { $addToSet: "$_id" },
              deliveredOrders: {
                $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] },
              },
              restaurantIds: {
                $addToSet: "$storeId",
              },
              restaurantCommission: {
                $sum: "$restaurantFinance.commissionAmount",
              },
              deliveryCommission: { $sum: "$deliveryFinance.platformEarning" },
            },
          },
          {
            $project: {
              _id: 0,
              totalOrders: { $size: "$orderIds" },
              activeRestaurants: {
                $size: {
                  $filter: {
                    input: "$restaurantIds",
                    as: "id",
                    cond: { $ne: ["$$id", null] },
                  },
                },
              },
              revenue: {
                $add: ["$restaurantCommission", "$deliveryCommission"],
              },
              successRate: {
                $cond: [
                  { $eq: [{ $size: "$orderIds" }, 0] },
                  0,
                  {
                    $multiply: [
                      { $divide: ["$deliveredOrders", { $size: "$orderIds" }] },
                      100,
                    ],
                  },
                ],
              },
            },
          },
        ],

        // ---------------------
        // KPIs Previous Period
        // ---------------------
        previousKpis: [
          { $match: { createdAt: { $gte: previousStart, $lte: previousEnd } } },
          {
            $group: {
              _id: null,
              orderIds: { $addToSet: "$_id" },
              deliveredOrders: {
                $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] },
              },
              restaurantIds: {
                $addToSet: "$storeId",
              },
              restaurantCommission: {
                $sum: "$restaurantFinance.commissionAmount",
              },
              deliveryCommission: { $sum: "$deliveryFinance.platformEarning" },
            },
          },
          {
            $project: {
              _id: 0,
              totalOrders: { $size: "$orderIds" },
              activeRestaurants: {
                $size: {
                  $filter: {
                    input: "$restaurantIds",
                    as: "id",
                    cond: { $ne: ["$$id", null] },
                  },
                },
              },
              revenue: {
                $add: ["$restaurantCommission", "$deliveryCommission"],
              },
              successRate: {
                $cond: [
                  { $eq: [{ $size: "$orderIds" }, 0] },
                  0,
                  {
                    $multiply: [
                      { $divide: ["$deliveredOrders", { $size: "$orderIds" }] },
                      100,
                    ],
                  },
                ],
              },
            },
          },
        ],

        // ---------------------
        // Orders Trend
        // ---------------------
        ordersTrend: [
          { $match: { createdAt: { $gte: currentStart, $lte: currentEnd } } },
          {
            $group: {
              _id: {
                date: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { "_id.date": 1 } },
          { $project: { _id: 0, date: "$_id.date", count: 1 } },
        ],

        // ---------------------
        // Revenue Trend
        // ---------------------
        revenueTrend: [
          {
            $match: {
              createdAt: { $gte: currentStart, $lte: currentEnd },
              status: "delivered",
            },
          },
          {
            $group: {
              _id: {
                date: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                },
              },
              amount: {
                $sum: {
                  $add: [
                    "$restaurantFinance.commissionAmount",
                    "$deliveryFinance.platformEarning",
                  ],
                },
              },
            },
          },
          { $sort: { "_id.date": 1 } },
          { $project: { _id: 0, date: "$_id.date", amount: 1 } },
        ],

        // ---------------------
        // Order Status Summary
        // ---------------------
        orderStatusSummary: [
          { $match: { createdAt: { $gte: currentStart, $lte: currentEnd } } },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ],

        // ---------------------
        // Recent Orders
        // ---------------------
        recentOrders: [
          { $sort: { createdAt: -1 } },
          { $limit: 10 },
          {
            $project: {
              _id: 1,
              orderId: 1,
              itemsCount: {
                $size: {
                  $filter: {
                    input: { $ifNull: ["$items", []] },
                    as: "item",
                    cond: {
                      $eq: ["$storeId", "$storeId"],
                    },
                  },
                },
              },
              status: 1,
              totalPrice: "$total",
              createdAt: 1,
            },
          },
        ],

        // ---------------------
        // Recent Transactions
        // ---------------------
        recentTransactions: [
          {
            // Join transactions linked to this order
            $lookup: {
              from: "transactions",
              localField: "_id",
              foreignField: "order",
              as: "transaction",
            },
          },

          {
            $unwind: {
              path: "$transaction",
              preserveNullAndEmptyArrays: false,
            },
          },

          {
            // Only successful online payments
            $match: {
              "transaction.status": "paid",
              "transaction.paymentMethod": {
                $in: ["flutterwave", "monnify"],
              },
            },
          },

          { $sort: { "transaction.createdAt": -1 } },
          { $limit: 10 },

          {
            $project: {
              _id: 1,

              transactionId: "$transaction.reference",
              status: "$transaction.status",
              paymentMethod: "$transaction.paymentMethod",
              amount: "$transaction.amount",
              createdAt: "$transaction.createdAt",

              orderId: "$orderNumber",
            },
          },
        ],
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    data: { data: vendorDashboardData },
  });
});

export const getUserAppDashboard = catchAsync(async (req, res, next) => {
  // eslint-disable-next-line prefer-const
  let [banners, categories, restaurants, products] = await Promise.all([
    Banner.find({ isActive: true })
      .select("image action")
      .sort({ createdAt: -1 }),

    Category.find({ isFeatured: true })
      .select("name image")
      .sort({ createdAt: -1 })
      .limit(8),

    Restaurant.find()
      .select(
        "coverImage location logo name openingHours ratingsQuantity ratingsAverage"
      )
      .sort({ ratingsAverage: -1, createdAt: -1 })
      .limit(5),

    Product.find()
      .select(
        "name imageCover restaurant ratingsAverage ratingsQuantity price priceDiscount"
      )
      .sort({ ratingsAverage: -1, createdAt: -1 })
      .limit(5),
  ]);

  let cartItems = [];

  if (req.user?._id) {
    cartItems = await CartItem.find({ user: req.user._id }).populate("product");
  }

  res.status(200).json({
    status: "success",
    data: {
      banners,
      categories,
      restaurants,
      products,
      cartItems,
    },
  });
});

export const globalSearch = catchAsync(async (req, res, next) => {
  // ============================
  // 🔹 SAFE QUERY PARSING
  // ============================

  const {
    q,
    page = "1",
    limit = "10",
    minPrice,
    maxPrice,
    minRating,
    sort = "relevance",
  } = req.query;

  if (!q || q.trim().length < 2) {
    return next(new AppError("Query too short", 400));
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(50, Number(limit) || 10);
  const skip = (pageNum - 1) * limitNum;

  const minPriceNum = minPrice !== undefined ? Number(minPrice) : undefined;
  const maxPriceNum = maxPrice !== undefined ? Number(maxPrice) : undefined;
  const minRatingNum = minRating !== undefined ? Number(minRating) : undefined;

  // ============================
  // 🔹 TIME CALCULATION (SAFE)
  // ============================

  const now = new Date();
  const currentDay = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
    now.getDay()
  ];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // ============================
  // 🔹 RESTAURANT PIPELINE
  // ============================

  const restaurantPipeline = [
    {
      $search: {
        index: "restaurant_search",
        compound: {
          should: [
            {
              autocomplete: {
                query: q,
                path: "name",
                fuzzy: { maxEdits: 1 },
                score: { boost: { value: 3 } },
              },
            },
            {
              text: {
                query: q,
                path: "description",
                fuzzy: { maxEdits: 1 },
              },
            },
          ],
          filter: [{ equals: { path: "status", value: "active" } }],
          minimumShouldMatch: 1,
        },
      },
    },

    // Compute open now (minutes comparison safer)
    {
      $addFields: {
        isOpenNow: {
          $anyElementTrue: {
            $map: {
              input: { $ifNull: ["$openingHours", []] },
              as: "hour",
              in: {
                $and: [
                  { $eq: ["$$hour.day", currentDay] },
                  { $eq: ["$$hour.isClosed", false] },
                  {
                    $lte: [
                      {
                        $add: [
                          {
                            $multiply: [
                              { $toInt: { $substr: ["$$hour.open", 0, 2] } },
                              60,
                            ],
                          },
                          {
                            $toInt: { $substr: ["$$hour.open", 3, 2] },
                          },
                        ],
                      },
                      currentMinutes,
                    ],
                  },
                  {
                    $gte: [
                      {
                        $add: [
                          {
                            $multiply: [
                              { $toInt: { $substr: ["$$hour.close", 0, 2] } },
                              60,
                            ],
                          },
                          {
                            $toInt: { $substr: ["$$hour.close", 3, 2] },
                          },
                        ],
                      },
                      currentMinutes,
                    ],
                  },
                ],
              },
            },
          },
        },
        score: { $meta: "searchScore" },
      },
    },

    ...(minRatingNum !== undefined
      ? [{ $match: { ratingsAverage: { $gte: minRatingNum } } }]
      : []),

    {
      $sort: sort === "rating" ? { ratingsAverage: -1 } : { score: -1 },
    },

    { $skip: skip },
    { $limit: limitNum },

    {
      $project: {
        name: 1,
        coverImage: 1,
        ratingsAverage: 1,
        isOpenNow: 1,
        score: 1,
      },
    },
  ];

  // ============================
  // 🔹 PRODUCT PIPELINE
  // ============================

  const productPipeline = [
    {
      $search: {
        index: "product_search",
        compound: {
          should: [
            {
              autocomplete: {
                query: q,
                path: "name",
                fuzzy: { maxEdits: 1 },
                score: { boost: { value: 3 } },
              },
            },
            {
              text: {
                query: q,
                path: "description",
                fuzzy: { maxEdits: 1 },
              },
            },
          ],
          filter: [{ equals: { path: "isAvailable", value: true } }],
          minimumShouldMatch: 1,
        },
      },
    },

    {
      $addFields: {
        effectivePrice: {
          $cond: [
            {
              $gt: [{ $size: { $ifNull: ["$productVariations", []] } }, 0],
            },
            { $min: "$productVariations.price" }, // ensure lowercase matches schema
            "$price",
          ],
        },
        score: { $meta: "searchScore" },
      },
    },

    ...(minPriceNum !== undefined || maxPriceNum !== undefined
      ? [
          {
            $match: {
              effectivePrice: {
                ...(minPriceNum !== undefined && { $gte: minPriceNum }),
                ...(maxPriceNum !== undefined && { $lte: maxPriceNum }),
              },
            },
          },
        ]
      : []),

    {
      $sort:
        // eslint-disable-next-line no-nested-ternary
        sort === "price"
          ? { effectivePrice: 1 }
          : sort === "rating"
            ? { ratingsAverage: -1 }
            : { score: -1 },
    },

    { $skip: skip },
    { $limit: limitNum },

    {
      $project: {
        name: 1,
        imageCover: 1,
        effectivePrice: 1,
        ratingsAverage: 1,
        restaurant: 1,
      },
    },
  ];

  // ============================
  // 🔹 CATEGORY PIPELINE
  // ============================

  const categoryPipeline = [
    {
      $search: {
        index: "category_search",
        compound: {
          should: [
            {
              autocomplete: {
                query: q,
                path: "name",
                tokenOrder: "sequential",
              },
            },
            {
              text: {
                query: q,
                path: "description",
              },
            },
          ],
          filter: [
            {
              equals: {
                path: "isActive",
                value: true,
              },
            },
          ],
          minimumShouldMatch: 1,
        },
      },
    },

    // Add search score
    {
      $addFields: {
        score: { $meta: "searchScore" },
      },
    },

    // Sort by relevance
    {
      $sort: { score: -1 },
    },

    { $skip: skip },
    { $limit: limitNum },

    {
      $project: {
        name: 1,
        image: 1,
      },
    },
  ];

  // ============================
  // 🔹 EXECUTION
  // ============================

  const [restaurants, products, categories] = await Promise.all([
    Restaurant.aggregate(restaurantPipeline),
    Product.aggregate(productPipeline),
    Category.aggregate(categoryPipeline),
  ]);

  res.status(200).json({
    page: pageNum,
    limit: limitNum,
    results: {
      restaurants: restaurants.length,
      products: products.length,
      categories: categories.length,
    },
    data: {
      restaurants,
      products,
      categories,
    },
  });
});

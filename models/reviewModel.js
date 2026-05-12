import mongoose from "mongoose";

import Product from "./productModel.js";
import Restaurant from "./restaurantModel.js";
import Rider from "./riderModel.js";

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, "Review cannot be empty"],
    },

    rating: {
      type: Number,
      required: [true, "Review must have a rating"],
      min: 1,
      max: 5,
    },

    order: {
      type: mongoose.Schema.ObjectId,
      ref: "Order",
      required: true,
    },

    // Generic entity to review: could be Restaurant, Rider, or Product
    entityType: {
      type: String,
      enum: ["Restaurant", "Rider", "Product"],
      required: true,
    },

    entityId: {
      type: mongoose.Schema.ObjectId,
      required: true,
      refPath: "entityType", // Dynamically references the collection based on entityType
    },

    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Review must belong to a user"],
    },

    likes: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: "user",
    select: "firstName profileImage ",
  });

  next();
});

reviewSchema.statics.calcAverageRatings = async function (
  entityType,
  entityId
) {
  // Build the aggregation dynamically
  const matchStage = {
    $match: { entityType, entityId },
  };

  const stats = await this.aggregate([
    matchStage,
    {
      $group: {
        _id: "$entityId",
        nRatings: { $sum: 1 },
        totalRating: { $sum: "$rating" },
        avgRating: { $avg: "$rating" },
        oneStar: {
          $sum: {
            $cond: [
              {
                $and: [{ $gte: ["$rating", 1] }, { $lte: ["$rating", 2] }],
              },
              1,
              0,
            ],
          },
        },
        twoStar: {
          $sum: {
            $cond: [
              {
                $and: [{ $gte: ["$rating", 2] }, { $lte: ["$rating", 3] }],
              },
              1,
              0,
            ],
          },
        },
        threeStar: {
          $sum: {
            $cond: [
              {
                $and: [{ $gte: ["$rating", 3] }, { $lte: ["$rating", 4] }],
              },
              1,
              0,
            ],
          },
        },
        fourStar: {
          $sum: {
            $cond: [
              {
                $and: [{ $gte: ["$rating", 4] }, { $lte: ["$rating", 5] }],
              },
              1,
              0,
            ],
          },
        },
        fiveStar: {
          $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] },
        },
      },
    },
  ]);

  // Dynamically pick the model
  const Model = { Restaurant, Product, Rider }[entityType];

  if (!Model) return;

  if (stats.length > 0) {
    await Model.findByIdAndUpdate(entityId, {
      ratingsAverage: stats[0].avgRating,
      ratingsQuantity: stats[0].nRatings,
      ratingsTotal: stats[0].totalRating,
      ratingsBreakdown: {
        1: stats[0].oneStar,
        2: stats[0].twoStar,
        3: stats[0].threeStar,
        4: stats[0].fourStar,
        5: stats[0].fiveStar,
      },
    });
  } else {
    await Model.findByIdAndUpdate(entityId, {
      ratingsAverage: 0,
      ratingsQuantity: 1,
      ratingsBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    });
  }
};

// Auto-update ratings after save or findOneAndUpdate/Delete
reviewSchema.post("save", function () {
  this.constructor.calcAverageRatings(this.entityType, this.entityId);
});

reviewSchema.pre(/^findOneAnd/, async function (next) {
  // where r is used to donate review
  //   this.model.findOne(this.getQuery()) creates a new query object.
  // It doesn’t interfere with the current findOneAnd... query.
  // That avoids the "Query was already executed" error.
  this.r = await this.model.findOne(this.getQuery());
  // this will allow us have the document BEFORE the update/delete

  next();
});

reviewSchema.post(/^findOneAnd/, async function (doc) {
  // `doc` is the updated one (if available with { new: true })
  // `this.r` is the old one you captured in pre()

  const review = doc || this.r;
  if (!review) return;

  if (doc) {
    await doc.constructor.calcAverageRatings(
      review.entityType,
      review.entityId
    );
  }
});

reviewSchema.index(
  { entityType: 1, entityId: 1, user: 1, order: 1 },
  { unique: true }
);

const Review = mongoose.model("Review", reviewSchema);

export default Review;

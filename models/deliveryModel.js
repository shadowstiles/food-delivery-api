import mongoose from "mongoose";

import AppError from "../utils/appError.js";

const deliverySchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },

    rider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rider",
    },

    restaurant: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Restaurant",
      },
      name: String,
      email: String,
    },

    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },

        productName: String,
        variationId: mongoose.Schema.Types.ObjectId,
        variationName: String,
        variationImage: String,

        selectedAttributes: [
          {
            attributeName: String,
            optionName: String,
            price: Number,
          },
        ],

        quantity: Number,
        priceAtPurchase: Number,
        notes: String,
      },
    ],

    assignedAt: Date,
    pickedUpAt: Date,
    deliveredAt: Date,
    notes: String, // e.g. "Call on arrival"

    status: {
      type: String,
      enum: [
        "pending", // order placed but not yet assigned
        "assigned", // rider assigned
        "picked_up", // rider collected food
        "en_route", // rider on the way
        "delivered", // completed
        "failed", // failed attempt
        "cancelled", // cancelled delivery
      ],
      default: "pending",
    },

    pickupLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },

      coordinates: {
        type: [Number],
      },

      fullAddress: {
        type: String,
      },

      label: String,
      note: String,
    },

    dropoffLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },

      coordinates: {
        type: [Number],
        required: [true, "Coordinates are required [longitude, latitude]"],
      },

      fullAddress: {
        type: String,
      },

      label: String,
      note: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

deliverySchema.post("save", async (doc, next) => {
  if (doc.status === "delivered") {
    doc.deliveredAt = Date.now();

    await mongoose.model("Order").findByIdAndUpdate(doc.order, {
      status: "delivered",
      deliveredAt: doc.deliveredAt,
    });
  }

  if (doc.status === "picked_up") {
    doc.pickedUpAt = Date.now();
  }

  next();
});

deliverySchema.pre("save", async function (next) {
  if (!this.isModified("status") && !this.isModified("rider")) {
    return next();
  }

  if (!this.isNew) {
    const prev = await this.constructor.findById(this._id).lean();

    this._previousStatus = prev?.status;
    this._previousRider = prev?.rider?.toString();

    // 🚫 Block reassignment after delivery
    if (prev?.status === "delivered" && this.isModified("rider")) {
      return next(new AppError("Cannot reassign a completed delivery", 400));
    }
  }

  next();
});

deliverySchema.post("save", async (doc, next) => {
  const Rider = mongoose.model("Rider");

  const prevStatus = doc._previousStatus;
  const prevRider = doc._previousRider;
  const newRider = doc.rider?.toString();
  const { status } = doc;

  // No rider → nothing to do
  if (!newRider) return next();

  // 🆕 First assignment
  if (doc.isNew && status === "assigned") {
    await Rider.findByIdAndUpdate(newRider, {
      $inc: { "statistics.totalDeliveries": 1 },
    });
    return next();
  }

  // 🔁 Rider reassignment
  if (prevRider && prevRider !== newRider) {
    const dec = { "statistics.totalDeliveries": -1 };
    const inc = { "statistics.totalDeliveries": 1 };

    if (status === "delivered") {
      dec["statistics.completedDeliveries"] = -1;
      inc["statistics.completedDeliveries"] = 1;
    }

    if (status === "cancelled") {
      dec["statistics.cancelledDeliveries"] = -1;
      inc["statistics.cancelledDeliveries"] = 1;
    }

    await Promise.all([
      Rider.findByIdAndUpdate(prevRider, { $inc: dec }),
      Rider.findByIdAndUpdate(newRider, { $inc: inc }),
    ]);

    return next();
  }

  // 🔄 Status change (same rider)
  const updates = {};

  if (prevStatus !== "delivered" && status === "delivered") {
    updates["statistics.completedDeliveries"] = 1;
    doc.deliveredAt = Date.now();
  }

  if (prevStatus !== "cancelled" && status === "cancelled") {
    updates["statistics.cancelledDeliveries"] = 1;
  }

  if (Object.keys(updates).length > 0) {
    await Rider.findByIdAndUpdate(newRider, { $inc: updates });
  }

  next();
});

// Index for geospatial queries (find nearby riders)
deliverySchema.index({ dropoffLocation: "2dsphere" });
deliverySchema.index({ pickupLocation: "2dsphere" });

export default mongoose.model("Delivery", deliverySchema);

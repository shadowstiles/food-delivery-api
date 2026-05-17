import mongoose from "mongoose";

const restaurantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Restaurant name is required"],
      trim: true,
      minlength: [2, "Restaurant name must be at least 2 characters"],
      maxlength: [100, "Restaurant name must be less than 100 characters"],
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: [true, "A restaurant must have an owner"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Description must be less than 2000 characters"],
    },

    ratingsAverage: {
      type: Number,
      default: 0,
      min: [0, "Rating must be above 1.0"],
      max: [5, "Rating must be below 5.0"],
      set: (val) => Math.round(val * 100) / 100, // rounds e.g. 4.666 → 4.7
    },

    ratingsQuantity: {
      type: Number,
      default: 0,
    },

    ratingsTotal: {
      type: Number,
      default: 0,
    },

    ratingsBreakdown: {
      type: Object,
      default: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    },

    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
    },

    location: {
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
        required: [
          true,
          "To enable close restaurants user must have an address",
        ],
      },

      label: String,
      note: String,
    },

    commissionRate: Number,

    phone: {
      type: String,
      validate: {
        validator: (val) => /^\+?[0-9]{7,15}$/.test(val),
        message: "Phone number is invalid",
      },
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },

    logo: {
      type: String,
      validate: {
        validator: (val) =>
          !val || /^https?:\/\/.+\.(jpg|jpeg|png|webp)$/i.test(val),
        message: "Logo must be a valid image URL (jpg, jpeg, png, webp)",
      },
    },

    coverImage: {
      type: String,
      required: [true, "A restaurant must have a Cover Image"],
      validate: {
        validator: (val) => /^https?:\/\/.+\.(jpg|jpeg|png|webp)$/i.test(val),
        message: "Cover image must be a valid image URL (jpg, jpeg, png, webp)",
      },
    },

    openingHours: [
      {
        day: {
          type: String,
          enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
          required: true,
        },
        open: String,
        close: String,
        isClosed: { type: Boolean, default: false },
      },
    ],

    status: {
      type: String,
      enum: {
        values: ["active", "inactive"],
        message: "Status is either: active, inactive",
      },

      default: "active",
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//
// 🔹 Virtuals
//
restaurantSchema.virtual("reviews", {
  ref: "Review",
  foreignField: "restaurant",
  localField: "_id",
});

restaurantSchema.virtual("files", {
  ref: "File",
  foreignField: "ownerId",
  localField: "_id",
});

restaurantSchema.virtual("products", {
  ref: "Product",
  foreignField: "restaurant",
  localField: "_id",
});

// Normalize name
restaurantSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.name = this.name.trim().toLowerCase();
  }
  next();
});

// Validate location coordinates length
restaurantSchema.pre("save", function (next) {
  if (this.location?.coordinates?.length !== 2) {
    return next(new Error("Coordinates must be [longitude, latitude]"));
  }

  next();
});

// 🔹 Indexes
restaurantSchema.index({ ratingsAverage: -1 });
restaurantSchema.index({ location: "2dsphere" });

export default mongoose.model("Restaurant", restaurantSchema);

import mongoose from "mongoose";

const ProductAttributeOptionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },

  price: {
    type: Number,
    default: 0,
  },
});

const ProductAttributeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },

  type: {
    type: String,
    enum: ["single", "multiple"],
    default: "single",
  },

  required: {
    type: Boolean,
    default: false,
  },

  maxSelect: {
    type: Number,
    default: 1,
  },

  options: {
    type: [ProductAttributeOptionSchema],
    default: [],
  },
});

const ProductVariationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  description: {
    type: String,
    trim: true,
    maxlength: [500, "Description must be less than 500 characters"],
  },

  image: {
    type: String,
    default: "",
  },

  price: {
    type: Number,
    required: true,
  },

  discountPrice: {
    type: Number,
    default: 0,
  },

  preparationTime: {
    type: String,
    default: "20 - 30",
  },
});

const productSchema = new mongoose.Schema(
  {
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: [true, "A product must belong to a restaurant"],
    },

    category: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Category",
        required: [true, "A product must belong to a category"],
      },
    ],

    name: {
      type: String,
      trim: true,
      required: [true, "A product must have a name"],
      minlength: [2, "Product name must be at least 2 characters"],
      maxlength: [100, "Product name must be less than 100 characters"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description must be less than 500 characters"],
    },

    price: {
      type: Number,
      required: [true, "A product must have a price"],
      min: [0, "Price must be greater than 0"],
    },

    priceDiscount: {
      type: Number,
      default: 0,
      validate: {
        validator: function (val) {
          return val < this.price;
        },
        message: "Discount price ({VALUE}) should be below the regular price",
      },
    },

    imageCover: {
      type: String,
      required: [true, "A product must have a cover image"],
      validate: {
        validator: (val) => /^https?:\/\/.+\.(jpg|jpeg|png|webp)$/i.test(val),
        message: "Cover image must be a valid image URL (jpg, jpeg, png, webp)",
      },
    },

    images: [
      {
        type: String,
        validate: {
          validator: (val) => /^https?:\/\/.+\.(jpg|jpeg|png|webp)$/i.test(val),
          message: "Image must be a valid image URL (jpg, jpeg, png, webp)",
        },
      },
    ],

    ratingsQuantity: {
      type: Number,
      default: 0,
    },

    ratingsTotal: {
      type: Number,
      default: 0,
    },

    ratingsAverage: {
      type: Number,
      default: 0,
      max: [5, "Rating must be below 5.0"],
      set: (val) => Math.round(val * 100) / 100,
    },

    ratingsBreakdown: {
      type: Object,
      default: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    },

    productAttributes: {
      type: [ProductAttributeSchema],
      default: [],
    },

    productVariations: {
      type: [ProductVariationSchema],
      default: [],
    },

    deliveryTime: {
      type: String,
      default: "10 - 15",
    },

    isAvailable: {
      type: Boolean,
      default: true,
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
productSchema.virtual("finalPrice").get(function () {
  return this.price - (this.priceDiscount || 0);
});

productSchema.virtual("reviews", {
  ref: "Review",
  foreignField: "product",
  localField: "_id",
});

productSchema.virtual("files", {
  ref: "File",
  foreignField: "ownerId",
  localField: "_id",
});

//
// 🔹 Indexes
//
// One restaurant can’t have two products with the same name
productSchema.index(
  { restaurant: 1, name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

// For category filtering + sorting
productSchema.index({ category: 1, isAvailable: 1 });
productSchema.index({ ratingsAverage: -1, price: 1 });

//
// 🔹 Middleware
//

// Normalize product name
productSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.name = this.name.trim().toLowerCase();
  }

  next();
});

productSchema.pre("find", function (next) {
  // Skip if populated or manually disabled
  if (this.options.skipProductHooks) {
    return next();
  }

  this.populate({
    path: "restaurant",
    select: "coverImage name distance email location",
  });

  next();
});

productSchema.pre(/^find/, function (next) {
  // console.log(this._mongooseOptions.populate);

  // Skip if populated or manually disabled
  if (this.options.skipProductHooks) {
    return next();
  }

  this.populate({
    path: "category",
    select: "name",
  });

  next();
});

// Ensure discount is valid even on updates
productSchema.pre("save", function (next) {
  if (this.priceDiscount >= this.price) {
    return next(new Error("Discount price should be below the regular price"));
  }
  next();
});

export default mongoose.model("Product", productSchema);

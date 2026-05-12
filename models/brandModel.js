import mongoose from "mongoose";

const brandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Brand name is required"],
      trim: true,
      minlength: 2,
      maxlength: 50,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 200,
    },

    logo: {
      type: String, // image URL
      validate: {
        validator: function (val) {
          return /^https?:\/\/.+\.(jpg|jpeg|png|webp|svg)$/i.test(val);
        },
        message: "Logo must be a valid image URL",
      },
    },

    category: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Category",
      required: [true, "At least one category is required for a brand"],
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    isGlobal: {
      type: Boolean,
      default: true,
    },

    priority: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    isActive: {
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

brandSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.name = this.name.toLowerCase();
  }

  next();
});

brandSchema.pre(/^find/, function (next) {
  if (!this.getFilter().includeInactive) {
    this.where({ isActive: true });
  }
  next();
});

brandSchema.pre(/^find/, function (next) {
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

brandSchema.statics.getFeatured = function () {
  return this.find({ isFeatured: true }).sort({ priority: -1, name: 1 });
};

// Unique brand name (case-insensitive)
brandSchema.index(
  { name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

// Featured brands query optimization
brandSchema.index({ isFeatured: 1, priority: -1 });

// Category-based filtering
brandSchema.index({ category: 1 });

export default mongoose.model("Brand", brandSchema);

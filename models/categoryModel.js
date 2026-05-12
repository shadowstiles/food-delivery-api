import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      minlength: [2, "Category name must be at least 2 characters"],
      maxlength: [50, "Category name must be less than 50 characters"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [200, "Description must be less than 200 characters"],
    },

    image: {
      type: String, // URL
      // required: [true, "Category image is required"],
      validate: {
        validator: function (val) {
          return /^https?:\/\/.+\.(jpg|jpeg|png|webp)$/i.test(val);
        },
        message: "Image must be a valid URL (jpg, jpeg, png, webp)",
      },
    },

    isFeatured: { type: Boolean, default: false },
    priority: { type: Number, default: 0, min: 0, max: 100 }, // higher means more priority
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

// 🔹 Unique index on lowercase name
categorySchema.index(
  { name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

// 🔹 Middleware: normalize name before saving
categorySchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.name = this.name.toLowerCase();
  }
  next();
});

// 🔹 Middleware: exclude inactive categories from find queries
categorySchema.pre(/^find/, function (next) {
  if (!this.getFilter().includeInactive) {
    this.where({ isActive: true });
  }
  next();
});

// 🔹 Virtual (example: products under this category)
categorySchema.virtual("products", {
  ref: "Product",
  foreignField: "category",
  localField: "_id",
});

export default mongoose.model("Category", categorySchema);

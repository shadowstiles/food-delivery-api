import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "ownerType",
    },

    ownerType: {
      type: String,
      enum: ["customer", "rider", "vendor", "admin"],
    },

    purpose: {
      type: String,
      required: true,
      enum: [
        "passport",
        "product",
        "brand",
        "category",
        "banner",
        "restaurant",
        "nin",
        "license",
        "insurance",
        "vehicle",
        "logo",
        "rider",
      ],
    },

    storage: {
      type: String,
      enum: ["cloudinary", "s3"],
      required: true,
    },

    // Storage identifiers
    fileKey: String, // S3 key
    publicId: String, // Cloudinary public_id

    url: {
      type: String,
      required: true,
    },

    format: {
      type: String,
      enum: ["jpg", "jpeg", "png", "webp", "pdf", "doc", "docx"],
      lowercase: true,
    },

    size: {
      type: Number, // bytes
      min: 0,
    },

    metadata: mongoose.Schema.Types.Mixed,
    folder: String,
    originalName: String,

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

fileSchema.pre("validate", function (next) {
  if (this.storage === "s3" && !this.fileKey) {
    return next(new Error("fileKey required"));
  }

  if (this.storage === "cloudinary" && !this.publicId) {
    return next(new Error("publicId required"));
  }

  next();
});

// ──────────────────────────────
// Partial Unique Index
// ──────────────────────────────
fileSchema.index(
  { ownerId: 1, purpose: 1 },
  {
    unique: true,
    partialFilterExpression: {
      purpose: {
        $nin: [
          "category",
          "nin",
          "banner",
          "license",
          "insurance",
          "vehicle",
          "logo",
          "rider",
        ],
      },
      isDeleted: false,
    },
  }
);

fileSchema.index({ ownerId: 1 });

fileSchema.index({
  ownerType: 1,
  purpose: 1,
});

fileSchema.index({ createdAt: -1 });

export default mongoose.model("File", fileSchema);

import mongoose from "mongoose";

import AppError from "../utils/appError.js";

const fileSchema = new mongoose.Schema(
  {
    ownerId: mongoose.Schema.Types.ObjectId,

    ownerType: {
      type: String,
      enum: ["customer", "rider", "vendor", "admin"],
      required: true,
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

    metadata: Object,
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

// ──────────────────────────────
// Pre-save Uniqueness Enforcement
// ──────────────────────────────
fileSchema.pre("save", async function (next) {
  const file = this;

  const multiAllowedPurposes = [
    "category",
    "nin",
    "banner",
    "license",
    "insurance",
    "vehicle",
    "logo",
    "rider",
  ];

  if (!multiAllowedPurposes.includes(file.purpose)) {
    const existing = await mongoose.model("File").findOne({
      ownerId: file.ownerId,
      purpose: file.purpose,
      isDeleted: false,
      _id: { $ne: file._id },
    });

    if (existing) {
      return next(
        new AppError(
          `File with purpose "${file.purpose}" already exists for this owner`
        )
      );
    }
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

export default mongoose.model("File", fileSchema);

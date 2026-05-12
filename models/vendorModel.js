import mongoose from "mongoose";

const vendorSchema = new mongoose.Schema(
  {
    authId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
    },

    firstName: {
      type: String,
      required: [true, "Please tell us your first name"],
      trim: true,
    },

    lastName: {
      type: String,
      trim: true,
    },

    dob: Date,
    avatarUrl: String,
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },

    restaurants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Restaurant",
      },
    ],

    businessName: {
      type: String,
      trim: true,
      required: [true, "Vendor must have a business name"],
    },

    contactNumber: {
      type: String,
      trim: true,
      required: [true, "Vendor must provide a contact number"],
    },

    address: {
      type: String,
      trim: true,
      required: [true, "Vendor must provide an address"],
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
    },

    // 🏦 Payment Info
    bankDetails: {
      bankName: String,
      accountName: String,
      accountNumber: String,
    },

    status: {
      type: String,
      enum: ["active", "suspended", "pending"],
      default: "pending",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual populate: all orders linked to this vendor (via their restaurants)
vendorSchema.virtual("orders", {
  ref: "Order",
  localField: "restaurants",
  foreignField: "storeId",
});

vendorSchema.pre(/^find/, function (next) {
  this.populate({
    path: "authId",
  });

  next();
});

// Indexing for faster search
vendorSchema.index({ businessName: 1 });
vendorSchema.index({ status: 1, isVerified: 1 });

export default mongoose.model("Vendor", vendorSchema);

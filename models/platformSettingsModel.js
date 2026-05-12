import mongoose from "mongoose";

const platformSettingsSchema = new mongoose.Schema(
  {
    appName: {
      type: String,
      default: "",
      trim: true,
    },

    platformWallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
    },

    appLogo: {
      type: String,
      default: "",
    },

    riderCommissionRate: {
      type: Number, // %
      default: 20,
      min: 0,
      max: 50,
    },

    restaurantCommissionRate: {
      type: Number, // %
      default: 5,
      min: 0,
      max: 50,
    },

    baseDeliveryFee: {
      type: Number,
      default: 500,
    },

    perKmRate: {
      type: Number,
      default: 150,
    },

    minDeliveryFee: {
      type: Number,
      default: 500,
    },

    maxDeliveryFee: {
      type: Number,
      default: 2500,
    },

    freeDeliveryThreshold: {
      type: Number,
      default: 150000,
    },

    surgeMultiplier: {
      type: Number,
      default: 1,
      min: 1,
      max: 2,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  { timestamps: true }
);

export default mongoose.model("PlatformSettings", platformSettingsSchema);

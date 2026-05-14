import mongoose from "mongoose";

const platformSettingsSchema = new mongoose.Schema(
  {
    singleton: {
      type: String,
      default: "PLATFORM_SETTINGS",
      unique: true,
      immutable: true,
    },

    appName: {
      type: String,
      default: "",
      trim: true,
    },

    platformWallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
    },

    platformAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      immutable: true,
    },

    appLogo: {
      type: String,
      default: "",
    },

    riderCommissionRate: {
      type: Number,
      default: 20,
      min: 0,
      max: 50,
    },

    restaurantCommissionRate: {
      type: Number,
      default: 5,
      min: 0,
      max: 50,
    },

    baseDeliveryFee: {
      type: Number,
      default: 500,
      min: 0,
    },

    perKmRate: {
      type: Number,
      default: 150,
      min: 0,
    },

    minDeliveryFee: {
      type: Number,
      default: 500,
      min: 0,
    },

    maxDeliveryFee: {
      type: Number,
      default: 2500,
      min: 0,
    },

    freeDeliveryThreshold: {
      type: Number,
      default: 150000,
      min: 0,
    },

    surgeMultiplier: {
      type: Number,
      default: 1,
      min: 1,
      max: 3,
    },

    settingsVersion: {
      type: Number,
      default: 1,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  { timestamps: true, optimisticConcurrency: true }
);

platformSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();

  if (!settings) {
    settings = await this.create({});
  }

  return settings;
};

platformSettingsSchema.pre("save", async function (next) {
  const count = await mongoose.model("PlatformSettings").countDocuments();

  if (count > 0 && this.isNew) {
    return next(new Error("Platform settings already exists"));
  }

  next();
});

platformSettingsSchema.pre("save", function (next) {
  if (this.minDeliveryFee > this.maxDeliveryFee) {
    return next(new Error("Min delivery fee cannot exceed max"));
  }

  next();
});

export default mongoose.model("PlatformSettings", platformSettingsSchema);

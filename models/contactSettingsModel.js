import mongoose from "mongoose";

const contactSettingsSchema = new mongoose.Schema(
  {
    whatsappNumber: {
      type: String,
      trim: true,
      default: "",
    },

    facebookUrl: {
      type: String,
      trim: true,
      default: "",
    },

    instagramUrl: {
      type: String,
      trim: true,
      default: "",
    },

    twitterUrl: {
      type: String,
      trim: true,
      default: "",
    },

    supportEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const contactSettingsModel = mongoose.model(
  "ContactSettings",
  contactSettingsSchema
);

export default contactSettingsModel;

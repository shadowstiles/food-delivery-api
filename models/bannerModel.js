import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
    },

    subtitle: {
      type: String,
      trim: true,
    },

    image: {
      type: String, // URL or storage key
      required: true,
    },

    // What happens when user clicks the banner
    action: {
      type: {
        type: String,
        enum: ["restaurant", "category", "product", "external_link", "none"],
        default: "none",
      },

      value: {
        type: String, // restaurantId, categoryId, productId, or URL
      },
    },

    position: {
      type: String,
      enum: ["home_top", "home_middle", "home_bottom"],
      default: "home_top",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    priority: {
      type: Number, // lower number = higher priority
      default: 0,
    },

    startAt: {
      type: Date,
    },

    endAt: {
      type: Date,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  {
    timestamps: true,
  }
);

bannerSchema.index({ isActive: 1, priority: 1 });
bannerSchema.index({ startAt: 1, endAt: 1 });

export default mongoose.model("Banner", bannerSchema);

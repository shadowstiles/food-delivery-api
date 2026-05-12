import mongoose from "mongoose";

// Cart Addon
const cartAddonSchema = new mongoose.Schema(
  {
    addonId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    name: { type: String, required: true },

    price: {
      type: Number, // snapshot (kobo)
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

// Cart Item
const cartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    productName: String, // snapshot
    productImage: String, // snapshot

    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    variantName: String,

    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 50,
    },

    notes: {
      type: String,
      maxlength: 200,
    },

    unitPrice: {
      type: Number, // snapshot
      required: true,
      min: 0,
    },

    addons: [cartAddonSchema],

    // used for merging identical items
    uniqueKey: {
      type: String,
      required: true,
    },
  },
  { _id: true }
);

// Restaurant Cart
const restaurantCartSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },

    restaurantName: String, // snapshot
    restaurantEmail: String, // snapshot
    restaurantImage: String, // snapshot
    restaurantCommission: String, // snapshot

    restaurantAddress: {
      fullAddress: String,
      latitude: Number,
      longitude: Number,
    },

    notes: {
      type: String,
      maxlength: 300,
    },

    items: [cartItemSchema],
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    authId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
      unique: true,
      index: true,
    },

    activeRestaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      default: null,
    },

    appliedCoupon: {
      code: String,
      discountType: {
        type: String,
        enum: ["percent", "fixed"],
      },
      value: Number,
      discountAmount: Number,
    },

    restaurantCarts: [restaurantCartSchema],

    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 1000 * 60 * 60 * 24 * 3), // 3 days
      index: { expires: 0 }, // TTL index
    },
  },
  {
    timestamps: true,
  }
);

// Auto-remove empty store carts
cartSchema.pre("save", function (next) {
  this.restaurantCarts = this.restaurantCarts.filter(
    (rc) => rc.items && rc.items.length > 0
  );
  next();
});

cartSchema.index({ "restaurantCarts.restaurantId": 1 });

export default mongoose.model("Cart", cartSchema);

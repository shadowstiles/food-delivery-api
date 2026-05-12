import mongoose from "mongoose";
import { customAlphabet } from "nanoid";

// Custom ID generator (8 uppercase alphanumeric chars)
const generateOrderId = customAlphabet(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  8
);

// Addon
const orderAddonSchema = new mongoose.Schema(
  {
    name: String,
    price: Number, // kobo
  },
  { _id: false }
);

// Item
const orderItemSchema = new mongoose.Schema(
  {
    productId: mongoose.Schema.Types.ObjectId,
    productName: String,
    productImage: String,

    variantId: mongoose.Schema.Types.ObjectId,
    variantName: String,

    quantity: Number,

    unitPrice: Number,

    addons: [orderAddonSchema],
  },
  { _id: false }
);

// Address
const addressSchema = new mongoose.Schema(
  {
    fullAddress: String,
    latitude: Number,
    longitude: Number,
    label: String,
    note: String,
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    authId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      index: true,
    },

    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      index: true,
    },

    storeName: String,
    storeEmail: String,
    storeImage: String,
    storeCommission: Number,

    items: [orderItemSchema],

    subtotal: Number,
    deliveryFee: Number,
    serviceFee: Number,
    total: Number,

    currency: {
      type: String,
      default: "NGN",
    },

    deliveryAddress: addressSchema,

    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "preparing",
        "picked",
        "delivered",
        "cancelled",
      ],
      default: "pending",
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },

    paymentMethod: {
      type: String,
      enum: ["card", "cash", "monnify", "flutterwave", "monnify"],
    },

    paymentReference: String,
    paymentUrl: String,
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
    },

    walletPayment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WalletTransaction",
    },

    cashbackAmount: Number,
    promoCode: String,
    discountAmount: Number,

    riderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rider",
    },

    ridersChoice: {
      type: String,
      enum: ["pending", "accept", "reject"],
      default: "pending",
    },

    deliveryFinance: {
      delivery: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Delivery",
      },

      deliveryFee: Number,
      platformRate: Number,
      platformEarning: Number,
      riderPayout: Number,
    },

    restaurantFinance: {
      restaurantPayout: Number,
      commissionRate: Number,
      commissionAmount: Number,
    },

    acceptedAt: Date,
    preparingAt: Date,
    pickedAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,

    cancelReason: String,
  },
  { timestamps: true }
);

// Auto-generate unique orderId before saving
orderSchema.pre("validate", async function (next) {
  if (!this.orderNumber) {
    const random = generateOrderId();
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");

    this.orderNumber = `ORD-${date}-${random}`;
  }
  next();
});

orderSchema.pre(/^find/, function (next) {
  this.populate([{ path: "userId" }, { path: "riderId" }, { path: "authId" }]);

  next();
});

export default mongoose.model("Order", orderSchema);

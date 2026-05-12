import mongoose from "mongoose";

const refundSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },

    originalTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
    },

    // User-facing refund
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "NGN",
    },

    method: {
      type: String,
      enum: ["wallet", "card", "bank"],
      required: true,
    },

    // 🔒 FROZEN LIABILITY SPLIT (CRITICAL)
    split: {
      vendor: { type: Number, required: true, min: 0 },
      rider: { type: Number, required: true, min: 0 },
      platform: { type: Number, required: true, min: 0 },
    },

    // Wallet references (for execution & audit)
    vendorWallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
    },

    riderWallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
    },

    userWallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
    },

    platformWallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
    },

    // Ledger linkage (VERY IMPORTANT)
    walletTransactions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "WalletTransaction",
      },
    ],

    // Workflow & governance
    reason: {
      type: String,
      enum: [
        "ORDER_CANCELLED",
        "ITEM_UNAVAILABLE",
        "LATE_DELIVERY",
        "QUALITY_ISSUE",
        "FRAUD",
        "GOODWILL",
        "OTHER",
      ],
    },

    initiatedBy: {
      type: String,
      enum: ["user", "admin", "platform"],
      required: true,
    },

    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },

    status: {
      type: String,
      enum: [
        "requested",
        "approved",
        "processing",
        "success",
        "failed",
        "rejected",
        "disputed",
      ],
      default: "requested",
    },

    reference: {
      type: String,
      unique: true,
      sparse: true,
    },

    processedAt: Date,
    gatewayResponse: Object,
    metadata: Object,

    history: [
      {
        status: {
          type: String,
          enum: [
            "requested",
            "approved",
            "processing",
            "success",
            "failed",
            "rejected",
            "disputed",
          ],
        },
        changedAt: { type: Date, default: Date.now },
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],

    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes
refundSchema.index({ order: 1 });
refundSchema.index({ originalTransaction: 1 });
refundSchema.index({ status: 1 });

export default mongoose.model("Refund", refundSchema);

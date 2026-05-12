import mongoose from "mongoose";

const integerMoneyField = {
  type: Number,
  required: true,
  // min: 0,
  // validate: {
  //   validator: Number.isInteger,
  //   message: "{PATH} must be an integer amount in the smallest currency unit",
  // },
};

const settlementSchema = new mongoose.Schema(
  {
    settlementKey: {
      type: String,
      required: true,
      immutable: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "ownerType",
    },

    ownerType: {
      type: String,
      enum: ["Vendor", "Rider"],
      required: true,
    },

    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet", // recipient wallet
      required: true,
    },

    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },

    orderId: String,

    // Optional: support batch settlement later
    sourceType: {
      type: String,
      enum: ["order", "adjustment"],
      default: "order",
    },

    grossAmount: integerMoneyField,

    platformFee: integerMoneyField,

    netPayable: integerMoneyField,

    currency: {
      type: String,
      default: "NGN",
    },

    // Snapshot for audits
    breakdown: {
      commissionRate: Number,
      deliveryFee: Number,
      tax: Number,
    },

    snapshot: {
      orderTotal: Number,
      subtotal: Number,
      deliveryFee: Number,
      serviceFee: Number,
      discountAmount: Number,
      storeName: String,
      riderName: String,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "available",
        "processing",
        "paid",
        "failed",
        "reversed",
        "cancelled",
        // legacy states kept temporarily so old records can still hydrate
        "created",
        "ready",
        "settled",
      ],
      default: "pending",
    },

    releaseAt: {
      type: Date,
      required: true,
      index: true,
    },

    releasedAt: Date,

    batchId: {
      type: String,
      index: true,
    },

    payout: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payout",
    },

    walletTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WalletTransaction",
    },

    ledgerEntries: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LedgerEntry",
      },
    ],

    period: {
      from: Date,
      to: Date,
    },

    metadata: {
      type: Object, // snapshots, admin adjustments
    },
  },
  { timestamps: true }
);

// ─────────────────────────────
// Indexes
// ─────────────────────────────

// indexes
settlementSchema.index({ owner: 1, status: 1, createdAt: -1 });
settlementSchema.index({ payout: 1 });
settlementSchema.index({ order: 1, owner: 1 }, { unique: true });
settlementSchema.index({ status: 1, releaseAt: 1 });
settlementSchema.index({ status: 1, payout: 1 });
settlementSchema.index({ owner: 1, createdAt: -1 });
settlementSchema.index({ settlementKey: 1 }, { unique: true, sparse: true });

settlementSchema.pre("validate", function (next) {
  if (!this.settlementKey && this.ownerType && this.order && this.owner) {
    this.settlementKey = `${this.ownerType.toUpperCase()}:${this.order}:${this.owner}`;
  }

  if (!this.releaseAt) {
    this.releaseAt = this.createdAt || new Date();
  }

  next();
});

export default mongoose.model("Settlement", settlementSchema);

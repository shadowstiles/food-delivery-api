import mongoose from "mongoose";

const payoutSchema = new mongoose.Schema(
  {
    sourceWallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true, // always platform wallet
    },

    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "recipientType",
    },

    recipientType: {
      type: String,
      enum: ["Rider", "Vendor"],
      required: true,
    },

    destinationWallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet", // optional: if recipient has internal wallet
    },

    amount: {
      type: Number,
      required: true,
      // min: 1,
      // validate: {
      //   validator: Number.isInteger,
      //   message: "Amount must be an integer amount in the smallest currency unit",
      // },
    },

    currency: {
      type: String,
      default: "NGN",
    },

    method: {
      type: String,
      enum: ["flutterwave", "monnify"],
      required: true,
    },

    reference: {
      type: String,
      required: true,
      unique: true,
    },

    providerReference: String,

    walletTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WalletTransaction",
    },

    status: {
      type: String,
      enum: ["pending", "approved", "processing", "paid", "success", "failed"],
      default: "pending",
    },

    failureReason: String,

    processedAt: Date,

    retryCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastRetryAt: Date,

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },

    approvedAt: Date,

    bankDetails: {
      bankName: String,
      accountName: String,
      accountNumber: String,
    },

    settlement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Settlement",
    },

    metadata: {
      type: Object, // bank details, admin, gateway payload
    },
  },
  { timestamps: true }
);

// ─────────────────────────────
// Hooks
// ─────────────────────────────

payoutSchema.pre("save", function (next) {
  if (
    this.isModified("status") &&
    (this.status === "success" ||
      this.status === "paid" ||
      this.status === "failed")
  ) {
    this.processedAt = new Date();
  }
  next();
});

// ─────────────────────────────
// Indexes
// ─────────────────────────────

payoutSchema.index({ status: 1, createdAt: 1 });
payoutSchema.index({ recipient: 1, status: 1 });

export default mongoose.model("Payout", payoutSchema);

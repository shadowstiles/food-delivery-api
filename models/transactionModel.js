import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
    },

    authUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
    },

    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },

    payout: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payout",
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "NGN",
    },

    type: {
      type: String,
      enum: ["credit", "debit"], // For wallet-based operations
    },

    paymentMethod: {
      type: String,
      enum: ["flutterwave", "monnify", "monnify", "wallet"],
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },

    reference: {
      type: String,
      unique: true,
      required: true, // For Flutterwave/Paystack/wallet txn tracking
    },

    gatewayResponse: {
      type: Object, // Save raw gateway payload
      select: false,
    },

    metadata: {
      type: Object, // Flexible (device, location, note, etc.)
    },

    processedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Auto-set processedAt when transaction is finalized
transactionSchema.pre("save", function (next) {
  if (
    this.isModified("status") &&
    (this.status === "paid" || this.status === "failed")
  ) {
    this.processedAt = Date.now();
  }

  next();
});

transactionSchema.pre(/^find/, function (next) {
  this.populate({
    path: "authUser",
  });

  next();
});

// 🔹 Indexes for performance
transactionSchema.index({ authUser: 1, status: 1 });
transactionSchema.index({ order: 1 });
transactionSchema.index({ wallet: 1 });
export default mongoose.model("Transaction", transactionSchema);

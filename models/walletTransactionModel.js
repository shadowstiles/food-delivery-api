import mongoose from "mongoose";

import AppError from "../utils/appError.js";

const balanceSnapshotSchema = new mongoose.Schema(
  {
    available: Number,
    pending: Number,
    processing: Number,
    book: Number,
  },
  { _id: false }
);

const walletTransactionSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
      // min: 0,
      // validate: {
      //   validator: Number.isInteger,
      //   message: "Amount must be an integer amount in the smallest currency unit",
      // },
    },

    debitWallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      default: null,
    },

    creditWallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      default: null,
    },

    type: {
      type: String,
      enum: [
        "deposit",
        "payment",
        "withdrawal",
        "refund",
        "commission",
        "settlement",
        "transfer",
        "card_save",
        "adjustment",
        "debt_recovery",
      ],
      required: true,
    },

    direction: {
      type: String,
      enum: ["debit", "credit"],
    },

    category: {
      type: String,
      enum: [
        "earning",
        "deposit",
        "withdrawal",
        "refund",
        "commission",
        "settlement",
        "adjustment",
        "reversal",
        "payment",
        "transfer",
        "card_save",
        "debt_recovery",
      ],
    },

    // references for traceability
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    transaction: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" }, // external gateway txn
    payout: { type: mongoose.Schema.Types.ObjectId, ref: "Payout" },

    // for forensic auditability.
    balanceBeforeCredit: balanceSnapshotSchema,

    balanceAfterCredit: balanceSnapshotSchema,

    balanceBeforeDebit: balanceSnapshotSchema,

    balanceAfterDebit: balanceSnapshotSchema,

    reversalOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WalletTransaction",
    },

    reference: {
      type: String,
      unique: true,
      sparse: true, // allow null but unique if present
    },

    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
    },

    narration: { type: String, trim: true },
    metadata: { type: Object },

    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },

    initiatedAt: { type: Date, default: Date.now },
    completedAt: Date,
  },
  { timestamps: true }
);

// indexes
walletTransactionSchema.index({ status: 1 });
walletTransactionSchema.index({ debitWallet: 1, creditWallet: 1 });
walletTransactionSchema.index({ createdAt: -1 });
walletTransactionSchema.index({ type: 1, status: 1 });

// ✅ Prevent debit & credit being the same
walletTransactionSchema.pre("save", function (next) {
  if (
    this.debitWallet &&
    this.creditWallet &&
    this.debitWallet.toString() === this.creditWallet.toString()
  ) {
    return next(
      new AppError("Debit and credit wallets cannot be the same", 400)
    );
  }
  next();
});

// ✅ Auto-generate narration
walletTransactionSchema.pre("save", function (next) {
  if (!this.narration) {
    this.narration = `${this.type} of ₦${this.amount}`;
  }
  next();
});

// ✅ Auto-set completedAt
walletTransactionSchema.pre("save", function (next) {
  if (this.isModified("status") && this.status !== "pending") {
    this.completedAt = Date.now();
  }
  next();
});

export default mongoose.model("WalletTransaction", walletTransactionSchema);

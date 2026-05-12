import mongoose from "mongoose";

const integerMoneyField = {
  type: Number,
  default: 0,
  // min: 0,
  // validate: {
  //   validator: Number.isInteger,
  //   message: "{PATH} must be an integer amount in the smallest currency unit",
  // },
};

const walletSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "ownerType",
    },

    ownerType: {
      type: String,
      required: true,
      enum: ["User", "Rider", "Vendor", "Admin"],
    },

    walletNumber: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    balance: {
      available: integerMoneyField, // withdrawable
      pending: integerMoneyField, // earned but not released
      processing: integerMoneyField, // withdrawal/payout in progress
      book: integerMoneyField, // accounting total (available + pending + processing)
    },

    currency: {
      type: String,
      default: "NGN",
      enum: ["NGN", "USD"],
    },

    status: {
      type: String,
      enum: ["active", "frozen", "closed"],
      default: "active",
    },

    lastTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WalletTransaction",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

walletSchema.pre("validate", function (next) {
  const balance = this.balance || {};

  balance.available ??= 0;
  balance.pending ??= 0;
  balance.processing ??= 0;
  balance.book ??= 0;

  const expectedBook = balance.available + balance.pending + balance.processing;

  if (balance.book !== expectedBook) {
    balance.book = expectedBook;
  }

  next();
});

walletSchema.pre("validate", async function (next) {
  if (this.walletNumber) return next();

  let exists = true;

  async function generateWalletNumber() {
    const min = 1000000000; // 10 digits
    const max = 9999999999;

    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  }

  /* eslint-disable no-await-in-loop */
  while (exists) {
    const walletNumber = await generateWalletNumber();
    exists = await mongoose.models.Wallet.exists({ walletNumber });

    if (!exists) {
      this.walletNumber = walletNumber;
    }
  }

  next();
});

// 🔹 Add indexes for performance
walletSchema.index({ owner: 1, ownerType: 1 }, { unique: true });

export default mongoose.model("Wallet", walletSchema);

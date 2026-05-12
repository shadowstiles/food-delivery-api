import mongoose from "mongoose";

const cardSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ["flutterwave", "monnify"],
      required: true,
    },
    customerId: String,
    authorizationCode: String,

    card: {
      bank: String,
      brand: String,
      last4: String,
      first6: String,
      expMonth: String,
      expYear: String,
    },

    reusable: { type: Boolean, default: true },
    default: { type: Boolean, default: false },
    addedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export default mongoose.model("Card", cardSchema);

import mongoose from "mongoose";

const systemSchema = new mongoose.Schema(
  {
    isBootstrapped: {
      type: Boolean,
      default: false,
    },

    bootstrappedAt: Date,
  },
  {
    timestamps: true,
  }
);

systemSchema.pre("save", async function (next) {
  if (!this.isNew) return next();

  const count = await mongoose.model("System").countDocuments();

  if (count > 0) {
    return next(new Error("System document already exists"));
  }

  next();
});

export default mongoose.model("System", systemSchema);

import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },

    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },

    coordinates: {
      type: [Number],
      required: [true, "Coordinates are required [longitude, latitude]"],
    },

    fullAddress: {
      type: String,
      required: [true, "To enable close restaurants user must have an address"],
    },

    label: String,
    note: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexing for faster geospatial search
addressSchema.index({ type: 1, coordinates: "2dsphere" });

export default mongoose.model("Address", addressSchema);

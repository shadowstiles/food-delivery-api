import mongoose from "mongoose";

const savedItemSchema = new mongoose.Schema(
  {
    authId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
      select: false,
    },

    item: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "itemType", // Dynamic Reference  (Restaurant or Product or future models)
    },

    itemType: {
      type: String,
      required: true,
      enum: ["Restaurant", "Product", "Rider"], // can extend later (Offer, Rider, etc.)
    },
  },
  { timestamps: true }
);

// Prevent duplicates per user/item/itemType
savedItemSchema.index({ authId: 1, item: 1, itemType: 1 }, { unique: true });

savedItemSchema.virtual("itemDetails", {
  ref: (doc) => doc.itemType, // dynamic reference
  localField: "item",
  foreignField: "_id",
  justOne: true,
});

const SavedItem = mongoose.model("SavedItem", savedItemSchema);

export default SavedItem;

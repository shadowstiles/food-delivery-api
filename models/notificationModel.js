import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "recipientModel", // can be User, Rider, Vendor, Admin
      required: true,
    },
    recipientModel: {
      type: String,
      required: true,
      enum: ["User", "Rider", "Vendor", "Admin"],
    },
    title: {
      type: String,
      required: [true, "A notification must have a title"],
    },
    message: {
      type: String,
      required: [true, "A notification must have a message"],
    },
    type: {
      type: String,
      enum: [
        "order_update", // order status changed
        "payment", // payment related alerts
        "promo", // discounts / marketing
        "system", // system maintenance, updates
        "support", // messages from support/admin
      ],
      default: "system",
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: Object, // flexible JSON payload if needed (e.g., {orderId, riderName})
    },
  },
  {
    timestamps: true,
  }
);

// 🔎 Index for fast retrieval of unread notifications
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);

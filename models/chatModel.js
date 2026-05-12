import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },

    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatRoom",
      required: true, // Each order/vendor pair can have one room
    },

    senderRole: {
      type: String,
      enum: ["user", "rider", "vendor", "support", "platform"],
      required: true,
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "senderRole",
    },

    message: { type: String, trim: true },

    type: {
      type: String,
      enum: ["text", "image", "file"],
      default: "text",
    },

    attachments: [
      {
        url: String, // file URL
        filename: String,
        mimeType: String,
      },
    ],

    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "senderRole", // Users who have read this message
      },
    ],

    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Index for fast retrieval
chatMessageSchema.index({ order: 1, room: 1, timestamp: 1 });
chatMessageSchema.index({ room: 1, senderRole: 1 });

export default mongoose.model("ChatMessage", chatMessageSchema);

// Optional: ChatRoom schema for grouping messages
const chatRoomSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true,
  },

  participants: [
    {
      role: {
        type: String,
        enum: ["user", "rider", "vendor", "support", "platform"],
      },
      user: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "participants.role",
      },
    },
  ],

  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ChatMessage",
  },
});

export const ChatRoom = mongoose.model("ChatRoom", chatRoomSchema);

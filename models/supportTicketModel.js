import mongoose from "mongoose";

const supportTicketSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    ticketNumber: {
      type: String,
      unique: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    problem: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["pending", "resolved"],
      default: "pending",
    },

    adminReply: {
      type: String,
      default: "",
    },

    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// AUTO GENERATE TICKET NUMBER
supportTicketSchema.pre("save", async function (next) {
  if (!this.ticketNumber) {
    const random = Math.floor(1000 + Math.random() * 9000);

    this.ticketNumber = `SUP-${Date.now()}-${random}`;
  }

  next();
});

const supportTicketModel = mongoose.model("SupportTicket", supportTicketSchema);

export default supportTicketModel;

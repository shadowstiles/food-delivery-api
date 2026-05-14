import mongoose from "mongoose";

const adminActivitySchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },

    action: {
      type: String,
      enum: [
        "LOGIN",
        "LOGOUT",
        "UPDATE_SETTINGS",
        "DELETE_VENDOR",
        "APPROVE_VENDOR",
        "SUSPEND_RIDER",
      ],
    },

    targetId: mongoose.Schema.Types.ObjectId,

    targetType: String,

    description: String,

    ipAddress: String,

    userAgent: String,

    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

//
// INDEXES
//
adminActivitySchema.index({ admin: 1 });
adminActivitySchema.index({ createdAt: -1 });
adminActivitySchema.index({ action: 1 });

export default mongoose.model("AdminActivity", adminActivitySchema);

// await AdminActivity.create({
//   admin: req.admin._id,
//   action: "UPDATE_SETTINGS",
//   description: "Updated platform settings",
//   ipAddress: req.ip,
//   userAgent: req.headers["user-agent"],
// });

import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    authId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
    },

    firstName: {
      type: String,
      required: [true, "Please tell us your first name"],
      trim: true,
    },

    lastName: {
      type: String,
      trim: true,
    },

    roleLevel: {
      type: String,
      enum: ["superadmin", "manager", "support"],
      default: "support",
    },

    dob: Date,
    avatarUrl: String,
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },

    permissions: {
      type: [String], // flexible: e.g. ["manageUsers", "approveVendors", "refundPayments"]
      default: [],
    },

    assignedRegion: {
      type: String, // e.g. "Epe", "Lagos Mainland"
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastLogin: {
      type: Date,
    },

    activityLogs: [
      {
        action: String,
        targetId: mongoose.Schema.Types.ObjectId,
        description: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

adminSchema.pre(/^find/, function (next) {
  this.populate({
    path: "authId",
  });

  next();
});

// Index for quick queries
adminSchema.index({ roleLevel: 1 });
adminSchema.index({ isActive: 1 });

export default mongoose.model("Admin", adminSchema);

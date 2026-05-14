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
      lowercase: true,
      trim: true,
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

    isDeleted: {
      type: Boolean,
      default: false,
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
  this.where({ isDeleted: false });

  this.populate({
    path: "authId",
  });

  next();
});

adminSchema.pre(/^find/, function (next) {
  this.where({ isDeleted: false });
  next();
});

adminSchema.pre("save", async function (next) {
  if (this.roleLevel !== "superadmin") {
    return next();
  }

  const Admin = mongoose.model("Admin");

  const superAdminCount = await Admin.countDocuments({
    roleLevel: "superadmin",
    _id: { $ne: this._id },
  });

  if (superAdminCount >= 2) {
    return next(new Error("Maximum number of superadmins reached"));
  }

  next();
});

adminSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();

  if (!update.roleLevel || update.roleLevel !== "superadmin") {
    return next();
  }

  const Admin = mongoose.model("Admin");

  const docToUpdate = await this.model.findOne(this.getQuery());

  if (!docToUpdate) {
    return next();
  }

  if (docToUpdate.roleLevel === "superadmin") {
    return next();
  }

  const superAdminCount = await Admin.countDocuments({
    roleLevel: "superadmin",
  });

  if (superAdminCount >= 2) {
    return next(new Error("Maximum number of superadmins reached"));
  }

  next();
});

// Index for quick queries
adminSchema.index({ roleLevel: 1 });
adminSchema.index({ isActive: 1 });

export default mongoose.model("Admin", adminSchema);

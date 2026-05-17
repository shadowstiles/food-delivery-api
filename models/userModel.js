import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
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

    dob: Date,
    avatarUrl: String,
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },

    hasAddress: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

//
// 📌 Indexes
//
userSchema.index({ isActive: 1 });

//
// 🔎 Query Middleware (only fetch active users)
//
userSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeInactive) {
    this.find({ isActive: { $ne: false } });
  }

  this.populate({
    path: "authId",
  });

  next();
});

userSchema.post("save", async (doc, next) => {
  if (!doc.populated("authId")) {
    await doc.populate("authId");
  }

  next();
});

export default mongoose.model("User", userSchema);

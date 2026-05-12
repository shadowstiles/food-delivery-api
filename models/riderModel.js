import mongoose from "mongoose";
import validator from "validator";

const riderSchema = new mongoose.Schema(
  {
    // 🔗 Linked Auth User
    authId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
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

    // 👤 Verification Profile
    verificationPhoto: String,

    onboardingStage: {
      type: Number,
      default: 0,
    },

    nin: {
      type: String,
      minlength: 11,
      maxlength: 11,
    },

    // 🧾 Guarantors
    guarantors: [
      {
        name: { type: String },
        relationship: { type: String },
        phoneNumber: {
          type: String,

          validate: {
            validator: (v) => validator.isMobilePhone(v, "en-NG"),
            message: "Invalid Nigerian phone number",
          },
        },
        address: { type: String },
        idType: String,
        idNumber: String,
      },
    ],

    // 🏦 Payment Info
    bankDetails: {
      bankName: String,
      accountName: String,
      accountNumber: String,
    },

    // 🛵 Vehicle
    vehicle: {
      type: {
        type: String,
        enum: ["motorcycle", "car", "tricycle", "scooter", "other"],
      },
      registrationNumber: { type: String, uppercase: true },
      model: { type: String },
      year: Number,
      color: String,
      image: String,
    },

    // 📄 Documents
    driversLicense: {
      number: String,
      expiry: Date,
      image: String,
    },

    insurance: {
      provider: String,
      policyNumber: String,
      expiry: Date,
      image: String,
    },

    documents: {
      ninImage: String,
      licenseImage: String,
      insuranceImage: String,
      vehicleImage: String,
    },

    // 🔍 Background Check
    backgroundCheck: {
      submitted: { type: Boolean, default: false },
      provider: String,
      status: {
        type: String,
        enum: ["pending", "clear", "flagged"],
        default: "pending",
      },
      reportFile: String,
      verifiedAt: Date,
    },

    // 🎒 Delivery Bag
    deliveryBag: {
      issued: { type: Boolean, default: false },
      issueDate: Date,
      depositAmount: Number,
      returned: { type: Boolean, default: false },
    },

    // 🎓 Training
    training: {
      completed: { type: Boolean, default: false },
      completedAt: Date,
      videoSessionId: String,
      score: Number,
    },

    // 👨‍👩‍👧 Next of Kin
    nextOfKin: {
      name: { type: String },
      relationship: { type: String },
      phoneNumber: {
        type: String,
        validate: {
          validator: (v) => validator.isMobilePhone(v, "en-NG"),
          message: "Invalid phone number",
        },
      },
      address: String,
    },

    // 📍 Location
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [3.94716, 6.58757],
        index: "2dsphere",
      },
      address: String,
      description: String,
    },

    // 🚦 Status
    availabilityStatus: {
      type: String,
      enum: ["available", "onDelivery", "offline"],
      default: "offline",
    },

    employmentStatus: {
      type: String,
      enum: [
        "pending",
        "completed",
        "approved",
        "rejected",
        "suspended",
        "blocked",
      ],
      default: "pending",
    },

    reasons: {
      rejectionReason: String,
      suspensionReason: String,
      blockReason: String,
    },

    isVerified: { type: Boolean, default: false },

    // ⭐ Ratings
    ratingsAverage: {
      type: Number,
      default: 0,
    },

    ratingsQuantity: { type: Number, default: 1 },
    ratingsTotal: { type: Number, default: 0 },
    ratingsBreakdown: {
      type: Object,
      default: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    },

    // 🧾 Wallet
    wallet: { type: mongoose.Schema.Types.ObjectId, ref: "Wallet" },

    // 📱 Device
    device: {
      fcmToken: String,
      deviceId: String,
    },

    // 📊 Stats
    statistics: {
      totalDeliveries: {
        type: Number,
        default: 0,
        immutable: true,
      },
      completedDeliveries: {
        type: Number,
        default: 0,
        immutable: true,
      },
      cancelledDeliveries: {
        type: Number,
        default: 0,
        immutable: true,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//
// 📌 VIRTUALS
//
riderSchema.virtual("reviews", {
  ref: "Review",
  foreignField: "rider",
  localField: "_id",
});

// Virtual populate: all orders linked to this rider (via their restaurants)
riderSchema.virtual("orders", {
  ref: "Order",
  foreignField: "rider",
  localField: "_id",
});

//
// 📌 INDEXES
//
riderSchema.index({ availabilityStatus: 1, employmentStatus: 1 });
riderSchema.index({ "vehicle.registrationNumber": 1 });
riderSchema.index({ ratingsAverage: -1 });
riderSchema.index({ location: "2dsphere" });

//
// 📌 PRE-HOOKS
//

// Ensure coordinates remain numbers
riderSchema.pre("save", function (next) {
  if (this.location?.coordinates?.length > 0) {
    this.location.coordinates = this.location.coordinates.map(Number);
  }
  next();
});

// Auto-approve rider when all required items exist
riderSchema.pre("save", function (next) {
  const docsComplete =
    this.vehicle?.registrationNumber &&
    this.nin &&
    this.driversLicense?.number &&
    this.insurance?.policyNumber &&
    this.guarantors.length >= 1 &&
    this.training.completed === true &&
    this.backgroundCheck.status === "clear";

  if (docsComplete && this.employmentStatus === "pending") {
    this.employmentStatus = "completed";
  }

  next();
});

//
// 📌 INSTANCE METHODS
//

// Used by dispatcher
riderSchema.methods.isAvailable = function () {
  return (
    this.availabilityStatus === "available" &&
    this.employmentStatus === "approved"
  );
};

// Mark rider online
riderSchema.methods.goOnline = function () {
  this.availabilityStatus = "available";
  return this.save();
};

// Mark rider offline
riderSchema.methods.goOffline = function () {
  this.availabilityStatus = "offline";
  return this.save();
};

//
// 📌 STATIC METHODS
//

// Find nearest available rider
riderSchema.statics.findNearestAvailable = function (
  coords,
  maxDistance = 5000
) {
  return this.findOne({
    availabilityStatus: "available",
    employmentStatus: "approved",
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: coords },
        $maxDistance: maxDistance,
      },
    },
  });
};

riderSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();

  if (
    update?.statistics ||
    update?.$set?.statistics ||
    update?.$inc?.statistics
  ) {
    return next(new Error("Rider statistics cannot be updated directly"));
  }

  next();
});

riderSchema.pre(/^find/, function (next) {
  this.populate({
    path: "authId",
  });

  next();
});

export default mongoose.model("Rider", riderSchema);

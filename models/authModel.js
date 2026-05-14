import crypto from "crypto";

import bcrypt from "bcryptjs";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import mongoose from "mongoose";
import validator from "validator";

const authSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      unique: true,
      lowercase: true,
      sparse: true,
      trim: true,
      validate: [validator.isEmail, "Please provide a valid email"],
    },

    phoneNumber: {
      type: String,
      required: true,
      unique: true,

      set: (value) => {
        const phone = parsePhoneNumberFromString(value, "NG");

        if (!phone || !phone.isValid()) {
          throw new Error("Invalid Nigerian phone number");
        }

        return phone.number;
      },
    },

    passcode: {
      type: String,
      minlength: 6,
      maxlength: 6,
      select: false,

      required: function () {
        return this.role !== "admin";
      },
    },

    role: {
      type: String,
      enum: ["customer", "rider", "vendor", "admin"],
      default: "customer",
      immutable: true,
    },

    mustUpdatePasscode: {
      type: Boolean,
      default: false,
    },

    otp: {
      passcode: {
        code: { type: String, select: false },
        expires: { type: Date, select: false },
      },

      email: {
        code: { type: String, select: false },
        expires: { type: Date, select: false },
      },

      phone: {
        code: { type: String, select: false },
        expires: { type: Date, select: false },
      },
    },

    passcodeChangedAt: {
      type: Date,
      select: false,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//
// INDEXES
//
authSchema.index({ role: 1 });
authSchema.index({ isVerified: 1 });

//
// HASH PASSCODE
//
authSchema.pre("save", async function (next) {
  if (!this.isModified("passcode") || !this.passcode) {
    return next();
  }

  this.passcode = await bcrypt.hash(this.passcode, 12);

  this.passcodeChangedAt = Date.now() - 1000;

  next();
});

//
// PREVENT ROLE ESCALATION
//
authSchema.pre("save", function (next) {
  if (!this.isNew && this.isModified("role")) {
    return next(new Error("Role modification is not allowed"));
  }

  next();
});

//
// PASSCODE METHODS
//
authSchema.methods.correctPasscode = async function (
  candidatePasscode,
  userPasscode
) {
  return bcrypt.compare(candidatePasscode, userPasscode);
};

authSchema.methods.changedPasscodeAfter = function (JWTTimestamp) {
  if (this.passcodeChangedAt) {
    const changedTimestamp = parseInt(
      this.passcodeChangedAt.getTime() / 1000,
      10
    );

    return JWTTimestamp < changedTimestamp;
  }

  return false;
};

//
// OTP HELPERS
//
function generateOtp() {
  const rawOtp = crypto.randomInt(100000, 1000000).toString();

  const hashedOtp = crypto.createHash("sha256").update(rawOtp).digest("hex");

  return {
    rawOtp,
    hashedOtp,
    expires: Date.now() + 10 * 60 * 1000,
  };
}

authSchema.methods.createOtp = function (type) {
  const { rawOtp, hashedOtp, expires } = generateOtp();

  this.otp[type].code = hashedOtp;
  this.otp[type].expires = expires;

  return rawOtp;
};

export default mongoose.model("Auth", authSchema);

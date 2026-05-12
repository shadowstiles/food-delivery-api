import crypto from "crypto";

import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import validator from "validator";

const authSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      unique: true,
      lowercase: true,
      sparse: true, // allows null/undefined without breaking uniqueness
      validate: [validator.isEmail, "Please provide a valid email"],
    },

    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: (val) => {
          // Remove spaces for safety
          const cleaned = val.replace(/\s/g, "");
          return validator.isMobilePhone(cleaned, "en-NG");
        },
        message: "Please provide a valid phone number",
      },
    },

    // 🔑 Authentication
    passcode: {
      type: String,
      required: [true, "Please provide a passcode"],
      minlength: 6,
      maxlength: 6,
      select: false,
    },

    role: {
      type: String,
      enum: ["customer", "rider", "vendor", "admin"],
      default: "customer",
      immutable: function () {
        return this.role === "admin";
      },
    },

    // 🔐 OTPs grouped under subdocument
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

    passcodeChangedAt: { type: Date, select: false },

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
// 📌 Indexes
//
authSchema.index({ role: 1 });
authSchema.index({ isVerified: 1 });

//
// 🔐 Passcode
//
authSchema.pre("save", async function (next) {
  // Encrypt passcode if modified
  if (this.isModified("passcode")) {
    this.passcode = await bcrypt.hash(this.passcode, 12);
    this.passcodeChangedAt = Date.now() - 1000;
  }

  next();
});

//
// 🛠 Instance Methods
//
authSchema.methods.correctPasscode = async function (
  candidatePasscode,
  userPasscode
) {
  return await bcrypt.compare(candidatePasscode, userPasscode);
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
// 🔐 OTP Methods
//
function generateOtp() {
  const rawOtp = crypto.randomInt(100000, 1000000).toString();
  const hashedOtp = crypto.createHash("sha256").update(rawOtp).digest("hex");
  return { rawOtp, hashedOtp, expires: Date.now() + 10 * 60 * 1000 };
}

authSchema.methods.createOtp = function (type) {
  const { rawOtp, hashedOtp, expires } = generateOtp();
  this.otp[type].code = hashedOtp;
  this.otp[type].expires = expires;
  return rawOtp;
};

export default mongoose.model("Auth", authSchema);

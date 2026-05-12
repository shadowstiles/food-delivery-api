import crypto from "crypto";
import { promisify } from "util";

import jwt from "jsonwebtoken";

// import User from "../models/userModel.js";
import Admin from "../models/adminModel.js";
import Auth from "../models/authModel.js";
import Rider from "../models/riderModel.js";
import User from "../models/userModel.js";
import Vendor from "../models/vendorModel.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import sendEmail from "../utils/email/service.js";
import { adminSignupTemplate } from "../utils/email/templates/admin.js";
import {
  accountVerificationTemplate,
  passcodeResetTemplate,
} from "../utils/email/templates/auth.js";
import { riderPendingApprovalTemplate } from "../utils/email/templates/rider.js";
import { vendorSignupTemplate } from "../utils/email/templates/vendor.js";

// ====== Token Helper ======
export const signAccessToken = (id) =>
  jwt.sign({ id: id }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRES,
  });

function getPhoneVariants(phone) {
  if (!phone) return [];

  phone = phone.replace(/\s+/g, "");

  let withoutZero = phone;
  let withZero = phone;

  if (phone.startsWith("0")) {
    withoutZero = phone.slice(1);
    withZero = phone;
  } else {
    withoutZero = phone;
    withZero = `0${phone}`;
  }

  return [withoutZero, withZero];
}

const signRefreshToken = (id) =>
  jwt.sign({ id: id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES,
  });

const parseCookies = (req) => {
  if (req.cookies) return req.cookies;

  const header = req.headers.cookie;
  if (!header) return {};

  return Object.fromEntries(
    header.split(";").map((cookie) => {
      const [key, value] = cookie.trim().split("=");
      return [key, value];
    })
  );
};

// ====== Cookie Options ======
const getCookieOptions = () => {
  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIES_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    sameSite: "strict",
  };

  if (process.env.NODE_ENV === "production") options.secure = true;

  return options;
};

// ====== Generating Tokens ======
const createSendToken = (authUser, statusCode, res) => {
  const accessToken = signAccessToken(authUser._id);
  const refreshToken = signRefreshToken(authUser._id);

  res.cookie("refreshToken", refreshToken, getCookieOptions());

  // Remove password from output (Response)
  authUser.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token: accessToken,
    refreshToken,
    data: {
      user: authUser,
    },
  });
};

// ====== Registration ======
export const signup = catchAsync(async (req, res, next) => {
  const { phoneNumber, email, firstName, passcode, passcodeConfirm } = req.body;

  const isValidated = req.body.passcodeConfirm === req.body.passcode;
  if (!isValidated) {
    return next(new AppError("Passcode are not the same", 400));
  }

  const authUser = await Auth.create({
    phoneNumber,
    email,
    passcode,
    passcodeConfirm,
  });

  // 2)Generate the random reset token
  const verifyOTP = authUser.createOtp("email");
  await authUser.save({ validateBeforeSave: false });

  await User.create({
    authId: authUser._id,
    firstName: firstName,
  });

  // 3) Send it to the user's email
  try {
    const { html, text, subject } = accountVerificationTemplate({
      code: verifyOTP.toString(),
    });

    await sendEmail({ to: authUser.email, subject, html, text });
  } catch (error) {
    authUser.otp.email.code = undefined;
    authUser.otp.email.expires = undefined;

    await authUser.save({ validateBeforeSave: false });

    // console.debug("There was an error sending the email. Try again later");
  }

  // Remove password from output (Response)
  authUser.password = undefined;

  res.status(201).json({
    status: "success",
    data: {
      user: authUser,
    },
  });
});

export const signupRider = catchAsync(async (req, res, next) => {
  const { phoneNumber, firstName, email, passcode, passcodeConfirm } = req.body;

  const isValidated = req.body.passcodeConfirm === req.body.passcode;
  if (!isValidated) {
    return next(new AppError("Passcode are not the same", 400));
  }

  const authUser = await Auth.create({
    phoneNumber,
    email,
    passcode,
    passcodeConfirm,
    role: "rider",
  });

  // 2)Generate the random reset token
  const verifyOTP = authUser.createOtp("email");
  await authUser.save({ validateBeforeSave: false });

  await Rider.create({
    authId: authUser._id,
    firstName: firstName,
  });

  // 3) Send it to the user's email
  try {
    const { html, text, subject } = accountVerificationTemplate({
      code: verifyOTP.toString(),
    });

    await sendEmail({ to: authUser.email, subject, html, text });
  } catch (error) {
    authUser.otp.email.code = undefined;
    authUser.otp.email.expires = undefined;

    await authUser.save({ validateBeforeSave: false });

    // console.debug("There was an error sending the email. Try again later");
  }

  // Remove password from output (Response)
  authUser.password = undefined;

  res.status(201).json({
    status: "success",
    data: {
      user: authUser,
    },
  });

  try {
    const { html, text, subject } = riderPendingApprovalTemplate({
      riderName: req.body.firstName,
    });

    await sendEmail({ to: authUser.email, subject, html, text });
  } catch (error) {
    // console.debug("There was an error sending the email. Try again later");
  }
});

// ====== Registration (Admin) ======
export const createUserByAdmin = catchAsync(async (req, res, next) => {
  const { firstName, phoneNumber, email, role, lastName } = req.body;

  const authUser = new Auth({
    phoneNumber,
    email,
    role,
  });

  await authUser.save({ validateBeforeSave: false });

  let createdUser;

  if (role === "vendor") {
    const vendor = new Vendor({ authId: authUser._id, firstName, lastName });
    createdUser = await vendor.save({ validateBeforeSave: false });
  }

  if (role === "admin") {
    const admin = new Admin({ authId: authUser._id, firstName, lastName });
    createdUser = await admin.save({ validateBeforeSave: false });
  }

  if (role === "rider") {
    const rider = new Rider({ authId: authUser._id, firstName, lastName });
    createdUser = await rider.save({ validateBeforeSave: false });
  }

  await createdUser.populate("authId");

  res.status(201).json({
    status: "success",
    data: { createdUser },
  });

  if (role === "vendor") {
    // 3) Send it to the vendor's email
    try {
      const { html, text, subject } = vendorSignupTemplate({
        vendorName: firstName,
      });

      await sendEmail({ to: authUser.email, subject, html, text });
    } catch (error) {
      // console.debug("There was an error sending the email. Try again later");
    }
  }
});

// ====== Registration (Vendor) ======
export const createVendor = catchAsync(async (req, res, next) => {
  const {
    authId,
    firstName,
    phoneNumber,
    email,
    lastName,
    address,
    businessName,
  } = req.body;

  let newAuthUser;
  let newVendor;

  if (!authId) {
    newAuthUser = new Auth({
      phoneNumber,
      email,
      role: "vendor",
    });

    newVendor = new Vendor({
      authId: authId,
      firstName: firstName,
      lastName: lastName,
      contactNumber: phoneNumber,
      address: address,
      businessName: businessName,
    });
  } else {
    newVendor = await Vendor.findOne({ authId });

    newVendor.firstName = firstName;
    newVendor.lastName = lastName;
    newVendor.businessName = businessName;
    newVendor.address = address;
    newVendor.contactNumber = phoneNumber;
  }

  // 2)Generate the random reset token
  await newAuthUser.save({ validateBeforeSave: false });
  const token = newAuthUser.createOtp("email");

  await newVendor.save();

  res.status(201).json({
    status: "success",
    message: "Vendor Successfully Created",
  });

  try {
    const { html, text, subject } = accountVerificationTemplate({
      code: token.toString(),
    });

    await sendEmail({ to: newAuthUser.email, subject, html, text });
  } catch (error) {
    newAuthUser.otp.email.code = undefined;
    newAuthUser.otp.email.expires = undefined;

    await newAuthUser.save({ validateBeforeSave: false });

    // console.debug("There was an error sending the email. Try again later");
  }

  // 3) Send it to the vendor's email
  try {
    const { html, text, subject } = vendorSignupTemplate({
      vendorName: firstName,
    });

    await sendEmail({ to: newAuthUser.email, subject, html, text });
  } catch (error) {
    // console.debug("There was an error sending the email. Try again later");
  }
});

// ====== Update ======
export const updateAdminOnlySuper = catchAsync(async (req, res, next) => {
  const {
    authId,
    firstName,
    phoneNumber,
    email,
    lastName,
    permissions,
    assignedRegion,
    roleLevel,
  } = req.body;

  await Auth.findByIdAndUpdate(req.params.authId, {
    email: email,
    phoneNumber: phoneNumber,
  });

  const updatedAdmin = await Admin.findOneAndUpdate(
    { authId: authId },
    {
      firstName: firstName,
      lastName: lastName,
      permissions: permissions,
      assignedRegion: assignedRegion,
      roleLevel: roleLevel,
    }
  );

  res.status(200).json({
    status: "success",
    data: { data: updatedAdmin },
  });
});

// ====== Registration ======
export const createAdmin = catchAsync(async (req, res, next) => {
  const {
    firstName,
    phoneNumber,
    email,
    lastName,
    permissions,
    assignedRegion,
    roleLevel,
  } = req.body;

  const authUser = new Auth({
    phoneNumber,
    email,
    role: "admin",
  });

  const admin = new Admin({
    authId: authUser._id,
    firstName,
    lastName,
    assignedRegion: assignedRegion,
    permissions: permissions,
    roleLevel: roleLevel,
  });

  await authUser.save({ validateBeforeSave: false });
  await admin.save({ validateBeforeSave: false });

  res.status(201).json({
    status: "success",
    message: "Admin created successfully",
  });

  // 3) Send it to the vendor's email
  try {
    const { html, text, subject } = adminSignupTemplate({
      adminName: firstName,
      role: roleLevel,
    });

    await sendEmail({ to: authUser.email, subject, html, text });
  } catch (error) {
    // console.debug("There was an error sending the email. Try again later");
  }
});

// ====== Login ======
export const login = catchAsync(async (req, res, next) => {
  const { email, passcode, phoneNumber, role } = req.body;

  // 1) Validate input
  if (!(email || phoneNumber) || !passcode) {
    return next(
      new AppError("Please provide email/phone number and password", 400)
    );
  }

  const phoneVariants = getPhoneVariants(phoneNumber);

  // 2) Find user
  const authUser = await Auth.findOne({
    $or: [{ email }, { phoneNumber: { $in: phoneVariants } }],
  }).select("+passcode");

  // 3) Check if user exists
  if (!authUser) {
    return next(new AppError("Incorrect Email/Phone Number", 401));
  }

  // 4) Check if passcode is correct
  const correct = await authUser.correctPasscode(passcode, authUser.passcode);
  if (!correct) {
    return next(new AppError("Incorrect Passcode", 401));
  }

  if (
    ["customer", "rider"].includes(authUser.role) &&
    authUser.isVerified !== true
  ) {
    return next(new AppError("Please verify your account before login", 403));
  }

  if (role && authUser.role !== role) {
    return next(
      new AppError("Unauthorized. Only Riders can access this app", 401)
    );
  }

  // 5) Send token
  createSendToken(authUser, 200, res);
});

// ====== Refresh Token ======
export const refresh = catchAsync(async (req, res, next) => {
  let token;
  const cookies = parseCookies(req);
  const refreshToken =
    cookies.refreshToken ||
    req.headers["x-refresh-token"] ||
    req.body?.refreshToken;

  // 1) Get token and check it its there
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!refreshToken) {
    return next(
      new AppError("You are not logged in! Please login to get access", 401)
    );
  }

  // Verify Refresh Token
  const decoded = await promisify(jwt.verify)(
    refreshToken,
    process.env.JWT_REFRESH_SECRET
  );

  if (token) {
    const decodedAccessToken = jwt.decode(token);
    if (decodedAccessToken?.id && decodedAccessToken.id !== decoded.id) {
      return next(
        new AppError("Previous user changed! Please login again", 401)
      );
    }
  }

  if (!decoded?.id) {
    return next(new AppError("Previous user changed! Please login again", 401));
  }

  // 3) Check if user still exists
  const authUser = await Auth.findById(decoded.id).select("+passcodeChangedAt");

  if (!authUser) {
    return next(
      new AppError("The user belonging to this token no longer exist", 401)
    );
  }

  // 4) Check if user changed passcode after the token was issued
  if (authUser.changedPasscodeAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed passcode. Please log in again", 401)
    );
  }

  createSendToken(authUser, 200, res, false);
});

// ====== Protection Route ======
export const protect = catchAsync(async (req, res, next) => {
  let token;

  // 1) Get token and check it its there
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(
      new AppError("You are not logged in! Please login to get access", 401)
    );
  }

  // 2) Verify Token
  const decoded = await promisify(jwt.verify)(
    token,
    process.env.JWT_ACCESS_SECRET
  );

  // 3) Check if user still exists
  const authUser = await Auth.findById(decoded.id).select("+passcodeChangedAt");

  if (!authUser) {
    return next(
      new AppError("The user belonging to this token no longer exist", 401)
    );
  }

  // 4) Check if user changed password after the token was issued
  if (authUser.changedPasscodeAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed passcode. Please log in again", 401)
    );
  }

  // Grant access to protected route
  req.user = authUser;
  next();
});

// ====== Route Restriction ======
export const restrictTo = function (...roles) {
  return (req, res, next) => {
    const roleAliases = {
      user: "customer",
      vendor: "vendor",
    };

    const allowedRoles = roles.map((role) => roleAliases[role] || role);
    const currentRole = roleAliases[req.user.role] || req.user.role;

    if (!allowedRoles.includes(currentRole)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }

    next();
  };
};

export const restrictAdminToLevels = (...levels) =>
  catchAsync(async (req, res, next) => {
    if (req.user.role !== "admin") {
      return next(new AppError("Admin access required", 403));
    }

    const admin = await Admin.findOne({ authId: req.user.id }).select(
      "roleLevel isActive permissions"
    );

    if (
      !admin ||
      admin.isActive !== true ||
      !levels.includes(admin.roleLevel)
    ) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }

    req.adminProfile = admin;
    next();
  });

// ====== Generate Email OTP ======
export const generateEmailVerificationOTP = catchAsync(
  async (req, res, next) => {
    const authUser = await Auth.findOne({ email: req.body?.email });

    if (!authUser) {
      return next(new AppError("User Does not Exist", 404));
    }

    // 2)Generate the random reset token
    const resetOtp = authUser.createOtp("email");
    await authUser.save({ validateBeforeSave: false });

    // 3) Send it to the user's email
    try {
      const { html, text, subject } = accountVerificationTemplate({
        code: resetOtp.toString(),
      });

      await sendEmail({ to: authUser.email, subject, html, text });
    } catch (error) {
      authUser.otp.email.code = undefined;
      authUser.otp.email.expires = undefined;

      await authUser.save({ validateBeforeSave: false });

      // console.debug("There was an error sending the email. Try again later");
    }

    res.status(200).json({
      status: "success",
      message: "OTP sent to email!",
    });
  }
);

// ====== Verify Email Verification OTP ======
export const verifyEmailVericationOTP = catchAsync(async (req, res, next) => {
  // 1) Get users based on the token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.otp)
    .digest("hex");

  const authUser = await Auth.findOne({
    "otp.email.code": hashedToken,
    "otp.email.expires": { $gt: Date.now() },
  });

  // 2) If token has not expired, and there is user, set the new passcode
  if (!authUser) {
    return next(new AppError("OTP is invalid or has expired", 400));
  }

  authUser.isVerified = true;
  authUser.otp.email.code = undefined;
  authUser.otp.email.expires = undefined;

  if (authUser.role === "customer") {
    const user = await User.findOne({ authId: authUser._id }).setOptions({
      includeInactive: true,
    });

    if (!user) {
      return next(new AppError("User profile not found", 404));
    }

    user.isActive = true;
    await user.save();
  }

  await authUser.save({ validateBeforeSave: false });

  // 4) Log the user in, send JWT
  createSendToken(authUser, 200, res);
});

// ====== Forgot Passcode ======
export const forgotPasscode = catchAsync(async (req, res, next) => {
  // 1) Get User based on posted email
  const authUser = await Auth.findOne({ email: req.body.email });

  if (!authUser) {
    return next(new AppError("There is no user with that email address", 404));
  }

  // 2)Generate the random reset token
  const resetOtp = authUser.createOtp("passcode");
  await authUser.save({ validateBeforeSave: false });

  // 3) Send it to the user's email
  try {
    const { html, text, subject } = passcodeResetTemplate({
      code: resetOtp.toString(),
    });

    await sendEmail({ to: authUser.email, subject, html, text });
  } catch (error) {
    authUser.otp.passcode.code = undefined;
    authUser.otp.passcode.expires = undefined;
    await authUser.save({ validateBeforeSave: false });

    // console.debug("There was an error sending the email. Try again later");
  }

  res.status(200).json({
    status: "success",
    message: "Token sent to email!",
  });
});

// ====== Reset Passcode ======
export const resetPasscode = catchAsync(async (req, res, next) => {
  // 1) Get users based on the token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.otp)
    .digest("hex");

  const authUser = await Auth.findOne({
    "otp.passcode.code": hashedToken,
    "otp.passcode.expires": { $gt: Date.now() },
  });

  // 2) If token has not expired, and there is user, set the new passcode
  if (!authUser) {
    return next(new AppError("OTP is invalid or has expired", 400));
  }

  const isValidated = req.body.passcodeConfirm === req.body.passcode;
  if (!isValidated) {
    return next(new AppError("Passcode are not the same", 400));
  }

  authUser.passcode = req.body?.passcode;
  authUser.otp.passcode.code = undefined;
  authUser.otp.passcode.expires = undefined;

  await authUser.save({ validateBeforeSave: false });

  // 3) Update changedPasscodeAt for the user

  // 4) Log the user in, send JWT
  createSendToken(authUser, 200, res);
});

// ====== Update Passcode ======
export const updatePasscode = catchAsync(async (req, res, next) => {
  // 1) Get user from collections
  const authUser = await Auth.findById(req.user.id).select("+passcode");

  // 2) Check if POSTED current passcode is correct
  if (
    !(await authUser.correctPasscode(
      req.body?.passcodeCurrent,
      authUser.passcode
    ))
  ) {
    return next(new AppError("Your current passcode is wrong", 401));
  }

  const isValidated = req.body.passcodeConfirm === req.body.passcode;
  if (!isValidated) {
    return next(new AppError("Passcode are not the same", 400));
  }

  // 3) If so, update passcode
  authUser.passcode = req.body?.passcode;
  await authUser.save({ validateBeforeSave: false });

  // 4) Log user in, send JWT
  createSendToken(authUser, 200, res);
});

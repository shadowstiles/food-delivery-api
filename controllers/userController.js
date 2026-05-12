import * as factory from "./handlerFactory.js";
import Admin from "../models/adminModel.js";
import Auth from "../models/authModel.js";
import User from "../models/userModel.js";
import Vendor from "../models/vendorModel.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

const filterObj = (obj, ...allowedFileds) => {
  const newObj = {};

  Object.keys(obj).forEach((el) => {
    if (allowedFileds.includes(el)) {
      newObj[el] = obj[el];
    }
  });

  return newObj;
};

export const getMe = (req, res, next) => {
  req.params.id = req.user?.id;

  next();
};

export const updateMe = catchAsync(async (req, res, next) => {
  // 1) Create a error if the user tries to upadate his/her passcode
  if (req.body?.passcode || req.body?.passcodeConfirm) {
    return next(
      new AppError(
        "This route is not for passcode update use the /updatePasscode",
        400
      )
    );
  }

  // 3) Create a error if the user tries to upadate his/her email
  if (req.body?.email) {
    return next(new AppError("This route is not for email update", 400));
  }

  // 4) Filtered out unwanted fieldnames that where not allowed to be updated
  const filteredBody = filterObj(
    req.body,
    "firstName",
    "lastName",
    "dob",
    "gender"
  );

  // 4) Update user document
  const updatedUser = await User.findOneAndUpdate(
    { authId: req.user.id },
    filteredBody,
    {
      new: true,
      runValidators: true,
    }
  );

  // 6) Send Response
  res.status(200).json({
    status: "success",
    data: { user: updatedUser },
  });
});

export const deleteMe = catchAsync(async (req, res, next) => {
  await User.findOneAndUpdate({ authId: req.user?.id }, { isActive: false });

  res.status(204).json({
    status: "success",
    data: null,
  });
});

export const getUser = catchAsync(async (req, res, next) => {
  const user = await Auth.findById(req.params.id || req.user?.id);

  if (!user) {
    return next(new AppError(`No User found with that ID`, 404));
  }

  res.status(200).json({
    status: "success",
    data: { data: user },
  });
});

export const updateUser = catchAsync(async (req, res, next) => {
  const user = await User.findOneAndUpdate(
    { authId: req.params.id },
    req.body,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!user) {
    return next(new AppError(`No User found with that ID`, 404));
  }

  res.status(200).json({
    status: "success",
    data: { data: user },
  });
});

export const deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findOneAndDelete({
    authId: req.params.id || req.body.id,
  });

  if (!user) {
    return next(new AppError(`No User found with that ID`, 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});

export const getAllUsers = factory.getAll({ Model: User });

export const verifyUser = catchAsync(async (req, res, next) => {
  const { email, role } = req.body;

  const user = await Auth.findOne({ email: email, role: role });

  if (!user) {
    return next(new AppError(`No user found with that email`, 404));
  }

  if (user.isVerified) {
    return next(new AppError(`Account Already exists. Please Login`, 404));
  }

  let currentUser = user;

  if (user.role === "vendor") {
    currentUser = await Vendor.findOne({ authId: user._id });
  }

  if (user.role === "admin") {
    currentUser = await Admin.findOne({ authId: user._id });
  }

  if (!currentUser) {
    return next(new AppError(`No ${role} found with that email`, 404));
  }

  res.status(200).json({
    status: "success",
    data: { data: currentUser },
  });
});

export const updatePasscode = catchAsync(async (req, res, next) => {
  const { passcode, passcodeConfirm, authId } = req.body;

  const user = await Auth.findById(authId);

  if (!user) {
    return next(new AppError(`No user found`, 404));
  }

  const isValidated = passcodeConfirm === passcode;
  if (!isValidated) {
    return next(new AppError("Passcode are not the same", 500));
  }

  user.passcode = passcode;

  await user.save();

  res.status(200).json({
    status: "success",
  });
});

import Address from "../models/addressModel.js";
import User from "../models/userModel.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

// Get all user locations
export const getUsersLocations = catchAsync(async (req, res, next) => {
  const addresses = await Address.find({ userId: req.params.userId });

  if (!addresses) {
    return next(new AppError("Address not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      data: addresses,
    },
  });
});

// Add new location
export const addLocation = catchAsync(async (req, res, next) => {
  const { userId, coordinates, fullAddress, label, note, hasAddress } =
    req.body;

  const address = await Address.create({
    userId,
    coordinates,
    fullAddress,
    label,
    note,
  });

  if (!hasAddress) {
    await User.findByIdAndUpdate(userId, { hasAddress: true });
  }

  res.status(201).json({
    status: "success",
    data: {
      data: address,
    },
  });
});

// Update location by ID
export const updateLocation = catchAsync(async (req, res, next) => {
  const location = await Address.findByIdAndUpdate(
    req.params.locationId,
    req.body,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!location) return next(new AppError("Address not found", 404));

  res.status(200).json({
    status: "success",
    data: {
      data: location,
    },
  });
});

// Delete location by ID
export const deleteLocation = catchAsync(async (req, res, next) => {
  const location = await Address.findByIdAndDelete(req.params.locationId);

  if (!location) return next(new AppError("Address not found", 404));

  res
    .status(200)
    .json({ status: "success", message: "Address deleted successfully" });
});

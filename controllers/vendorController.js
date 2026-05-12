import * as factory from "./handlerFactory.js";
import Vendor from "../models/vendorModel.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

export const getAllVendor = factory.getAll({ Model: Vendor });
export const createVendor = factory.createOne(Vendor);

function filterVendorUpdate(body) {
  const allowedFields = [
    "firstName",
    "lastName",
    "businessName",
    "contactNumber",
    "address",
    "bankDetails",
  ];

  return Object.fromEntries(
    Object.entries(body).filter(([key]) => allowedFields.includes(key))
  );
}

export const updateVendor = catchAsync(async (req, res, next) => {
  const query =
    req.user.role === "admin"
      ? { _id: req.params.id }
      : { _id: req.params.id, authId: req.user.id };

  const vendor = await Vendor.findOneAndUpdate(
    query,
    filterVendorUpdate(req.body),
    {
      new: true,
      runValidators: true,
    }
  );

  if (!vendor) {
    return next(new AppError("No Vendor found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: { data: vendor },
  });
});

export const deleteVendor = catchAsync(async (req, res, next) => {
  const query =
    req.user.role === "admin"
      ? { _id: req.params.id || req.body.id }
      : { _id: req.params.id || req.body.id, authId: req.user.id };

  const vendor = await Vendor.findOneAndDelete(query);

  if (!vendor) {
    return next(new AppError("No Vendor found with that ID", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});

export const getVendor = catchAsync(async (req, res, next) => {
  const query =
    req.user.role === "admin"
      ? { _id: req.params.id }
      : { _id: req.params.id, authId: req.user.id };

  const vendor = await Vendor.findOne(query);

  if (!vendor) {
    return next(new AppError(`No Vendor found with that ID`, 404));
  }

  res.status(200).json({
    status: "success",
    data: { data: vendor },
  });
});

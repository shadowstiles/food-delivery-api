import * as factory from "./handlerFactory.js";
import Admin from "../models/adminModel.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

export const getAllAdmin = factory.getAll({ Model: Admin });
export const createAdmin = factory.createOne(Admin);
export const updateAdmin = factory.updateOne(Admin, "admin");
export const deleteAdmin = factory.deleteOne(Admin, "admin");

export const getAdmin = catchAsync(async (req, res, next) => {
  const admin = await Admin.findOne({
    $or: [{ _id: req.params.id }, { authId: req.params.id }],
  });

  if (!admin) {
    return next(new AppError(`No Admin found with that ID`, 404));
  }

  res.status(200).json({
    status: "success",
    data: { data: admin },
  });
});

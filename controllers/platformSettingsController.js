import * as factory from "./handlerFactory.js";
import Setting from "../models/platformSettingsModel.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import getPlatformSettings from "../utils/platformSettings.js";

export const getSetting = factory.getOne(Setting, "settings");
export const createSetting = factory.createOne(Setting);
export const updateSetting = factory.updateOne(Setting, "settings");
export const deleteSetting = factory.deleteOne(Setting, "settings");

export const getAllSetting = catchAsync(async (req, res, next) => {
  const settings = getPlatformSettings();

  if (!settings) return next(new AppError("No Settings Found", 404));

  return res.status(200).json({
    status: "success",
    data: { data: settings },
  });
});

import File from "../models/fileModel.js";
import {
  getFiles,
  restoreFile,
  softDeleteFile,
} from "../services/fileService.js";
import APIFeatures from "../utils/apiFeatures.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

export const getUserFilesByPurpose = catchAsync(async (req, res, next) => {
  const { ownerId } = req.params;
  const { purpose } = req.query;

  const files = await getFiles(ownerId, purpose, req);

  res.status(200).json({
    status: "success",
    data: { data: files },
  });
});

export const getAllFilesByPurpose = catchAsync(async (req, res, next) => {
  const { purpose } = req.params;

  let files = new APIFeatures(
    File.find({ purpose: purpose }),
    req.queryParams || req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  files = await files.query;

  res.status(200).json({
    status: "success",
    data: { data: files },
  });
});

export const softDelete = catchAsync(async (req, res, next) => {
  const { fileId } = req.body;

  const file = await softDeleteFile(fileId);
  if (!file) return next(new AppError("File not found", 404));

  res.status(200).json({
    status: "success",
    data: { data: file },
  });
});

export const restore = catchAsync(async (req, res, next) => {
  const { fileId } = req.body;

  const file = await restoreFile(fileId);
  if (!file) return next(new AppError("File not found", 404));

  res.status(200).json({
    status: "success",
    data: { data: file },
  });
});

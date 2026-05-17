import File from "../models/fileModel.js";
import APIFeatures from "../utils/apiFeatures.js";

export async function saveFileMetadata(data) {
  return await File.create(data);
}

export async function getFiles(ownerId, purpose, req) {
  const query = { ownerId };

  if (purpose) {
    query.purpose = purpose;
  }

  const files = new APIFeatures(File.find(query), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  return await files.query;
}

export async function softDeleteFile(fileId) {
  return await File.findByIdAndUpdate(
    fileId,
    { isDeleted: true },
    { new: true }
  );
}

export async function deleteFileMetadata(fileId) {
  return await File.findByIdAndDelete(fileId);
}

export async function restoreFile(fileId) {
  return await File.findByIdAndUpdate(
    fileId,
    { isDeleted: false },
    { new: true }
  );
}

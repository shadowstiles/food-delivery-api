import AppError from "./appError.js";
import cloudinary from "../config/cloudinaryConfig.js";

export function getSignedCloudinaryUrl(publicId, folder) {
  return cloudinary.url(`${folder}/${publicId}`, {
    secure: true,
    sign_url: true,
    type: "authenticated", // ensures signature is required
    transformation: [{ quality: "auto" }],
  });
}

export async function deleteFromCloudinary(publicId) {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (err) {
    throw new AppError(`Cloudinary delete failed: ${err.message}`);
  }
}

export async function listFromCloudinary(folder) {
  try {
    const result = await cloudinary.search
      .expression(`folder:${folder}`)
      .sort_by("created_at", "desc")
      .max_results(50)
      .execute();
    return result.resources.map((r) => ({
      publicId: r.public_id,
      url: r.secure_url,
      format: r.format,
      bytes: r.bytes,
      createdAt: r.created_at,
    }));
  } catch (err) {
    throw new AppError(`Cloudinary list failed: ${err.message}`);
  }
}

import AppError from "./appError.js";

function validateFile(file, purpose) {
  const allowedMimeTypes = {
    passport: ["image/jpeg", "image/png"],
    rider: ["image/jpeg", "image/png"],
    brand: ["image/jpeg", "image/png"],
    banner: ["image/jpeg", "image/png"],
    product: ["image/jpeg", "image/png"],
    category: ["image/jpeg", "image/png"],
    restaurant: ["image/jpeg", "image/png"],
    logo: ["image/jpeg", "image/png"],
    documents: ["application/pdf", "image/jpeg", "image/png"],
    nin: ["application/pdf", "image/jpeg", "image/png"],
    license: ["application/pdf", "image/jpeg", "image/png"],
    insurance: ["application/pdf", "image/jpeg", "image/png"],
    vehicle: ["application/pdf", "image/jpeg", "image/png"],
  };

  const maxSizeMB = {
    passport: 5,
    rider: 5,
    banner: 5,
    brand: 5,
    product: 10,
    category: 10,
    restaurant: 10,
    logo: 10,
    nin: 10,
    license: 10,
    insurance: 10,
    vehicle: 10,
  };

  // Ensure purpose exists
  if (!allowedMimeTypes[purpose]) {
    throw new AppError(`Invalid purpose: ${purpose}`);
  }

  // Check MIME type
  if (!allowedMimeTypes[purpose].includes(file.mimetype)) {
    throw new AppError(
      `Invalid file type for ${purpose}. Allowed: ${allowedMimeTypes[purpose].join(", ")}`
    );
  }

  // Check file size
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > maxSizeMB[purpose]) {
    throw new AppError(
      `File too large for ${purpose}. Max size: ${maxSizeMB[purpose]}MB`
    );
  }

  return true;
}

export default validateFile;

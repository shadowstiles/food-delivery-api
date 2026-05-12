// middlewares/uploadCloudinary.js
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";

import cloudinary from "../config/cloudinaryConfig.js";

// {entityType}/{entityId}/{purpose}/{timestamp-random}.{ext}
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const { entityType, entityId, purpose } = req.body;
    return {
      folder: `epe-delivery-dev/${entityType}/${entityId}/${purpose}`,
      allowed_formats: ["jpg", "png", "jpeg", "pdf", "webp"],
      public_id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
  },
});

const uploadCloudinary = multer({ storage });

export default uploadCloudinary;

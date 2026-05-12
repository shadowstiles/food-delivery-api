import { Readable } from "stream";

import cloudinary from "../config/cloudinaryConfig.js";
import Category from "../models/categoryModel.js";
import Product from "../models/productModel.js";
import Restaurant from "../models/restaurantModel.js";
import Rider from "../models/riderModel.js";
import User from "../models/userModel.js";
import {
  saveFileMetadata,
  deleteFileMetadata,
} from "../services/fileService.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import {
  deleteFromCloudinary,
  getSignedCloudinaryUrl,
  listFromCloudinary,
} from "../utils/cloudinary.js";
import validateFile from "../utils/fileValidator.js";

const bufferToStream = (buffer) => {
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null);
  return readable;
};

export const upload = catchAsync(async (req, res, next) => {
  // eslint-disable-next-line prefer-const
  let { entityId, purpose } = req.body;
  const { file } = req;
  const ridersPurpose = ["nin", "vehicle", "insurance", "rider", "license"];

  // ✅ Validate
  validateFile(file, purpose);

  if (req.params.riderId) {
    if (!ridersPurpose.includes(purpose.toLowerCase())) {
      return next(new AppError("This route is not for this purpose", 400));
    }

    entityId = req.params.riderId;
  }

  const folder = `epe-delivery-dev/${purpose}`;

  const stream = cloudinary.uploader.upload_stream(
    { folder, resource_type: "auto" },
    async (error, result) => {
      if (error) return next(new AppError(error, 500));

      const saved = await saveFileMetadata({
        ownerId: entityId,
        ownerType: req.user.role,
        purpose,
        folder,
        storage: "cloudinary",
        publicId: result.public_id,
        url: result.secure_url,
        format: result.format,
        metadata: result.metadata,
        size: result.bytes,
      });

      if (purpose.toLowerCase() === "passport") {
        const user = await User.findByIdAndUpdate(entityId, {
          avatarUrl: saved.url,
        });

        if (!user) {
          return next(new AppError("User not found", 404));
        }
      }

      if (purpose.toLowerCase() === "product") {
        const product = await Product.findByIdAndUpdate(entityId, {
          imageCover: saved.url,
        });

        if (!product) {
          return next(new AppError("Product not found", 404));
        }
      }

      if (purpose.toLowerCase() === "category") {
        const category = await Category.findByIdAndUpdate(entityId, {
          image: saved.url,
        });

        if (!category) {
          return next(new AppError("Category not found", 404));
        }
      }

      // Restaurant
      if (purpose.toLowerCase() === "restaurant") {
        const restaurant = await Restaurant.findByIdAndUpdate(entityId, {
          coverImage: saved.url,
        });

        if (!restaurant) {
          return next(new AppError("Restaurant not found", 404));
        }
      }

      if (purpose.toLowerCase() === "logo") {
        const restaurant = await Restaurant.findByIdAndUpdate(entityId, {
          logo: saved.url,
        });

        if (!restaurant) {
          return next(new AppError("Restaurant not found", 404));
        }
      }

      // Rider
      if (purpose.toLowerCase() === "nin") {
        const rider = await Rider.findByIdAndUpdate(entityId, {
          "documents.ninImage": saved.url,
        });

        if (!rider) {
          return next(new AppError("Rider not found", 404));
        }
      }

      if (purpose.toLowerCase() === "license") {
        const rider = await Rider.findByIdAndUpdate(entityId, {
          "documents.licenseImage": saved.url,
          "driversLicense.image": saved.url,
        });

        if (!rider) {
          return next(new AppError("Rider not found", 404));
        }
      }

      if (purpose.toLowerCase() === "insurance") {
        const rider = await Rider.findByIdAndUpdate(entityId, {
          "documents.insuranceImage": saved.url,
          "insurance.image": saved.url,
        });

        if (!rider) {
          return next(new AppError("Rider not found", 404));
        }
      }

      if (purpose.toLowerCase() === "vehicle") {
        const rider = await Rider.findByIdAndUpdate(entityId, {
          "documents.vehicleImage": saved.url,
        });

        if (!rider) {
          return next(new AppError("Rider not found", 404));
        }
      }

      if (purpose.toLowerCase() === "rider") {
        const rider = await Rider.findByIdAndUpdate(entityId, {
          verificationPhoto: saved.url,
        });

        if (!rider) {
          return next(new AppError("Rider not found", 404));
        }
      }

      res.status(201).json({
        status: "success",
        message: "Upload was successful",
        data: { url: saved.url },
      });
    }
  );

  bufferToStream(file.buffer).pipe(stream);
});

export const uploadAdminVendor = catchAsync(async (req, res, next) => {
  const { purpose } = req.body;
  const { file } = req;

  // ✅ Validate
  validateFile(file, purpose);

  const folder = `epe-delivery-dev/${purpose}`;

  const stream = cloudinary.uploader.upload_stream(
    { folder, resource_type: "auto" },
    async (error, result) => {
      if (error) return next(new AppError(error, 500));

      const saved = await saveFileMetadata({
        ownerType: req.user.role,
        purpose,
        storage: "cloudinary",
        publicId: result.public_id,
        url: result.secure_url,
        format: result.format,
        metadata: result.metadata,
        originalName: file.originalname,
        folder,
        size: result.bytes,
      });

      res.status(201).json({
        status: "success",
        message: "Upload was successful",
        data: { data: saved },
      });
    }
  );

  bufferToStream(file.buffer).pipe(stream);
});

export const bulkUpload = catchAsync(async (req, res, next) => {
  const { purpose } = req.body;
  const { files } = req;

  // Run all uploads in parallel
  await Promise.all(
    // eslint-disable-next-line no-unused-vars
    files.map((file, _) => {
      // Validate each file before upload
      validateFile(file, purpose);

      const folder = `epe-delivery-dev/${purpose}`;

      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder, resource_type: "auto" },
          async (error, result) => {
            if (error) return reject(error);

            try {
              const saved = await saveFileMetadata({
                ownerType: req.user.role,
                purpose,
                storage: "cloudinary",
                publicId: result.public_id,
                url: result.secure_url,
                format: result.format,
                metadata: result.metadata,
                originalName: result.originalName,
                folder,
                size: result.bytes,
              });

              resolve(saved);
            } catch (err) {
              reject(err);
            }
          }
        );
        bufferToStream(file.buffer).pipe(stream);
      });
    })
  );

  res
    .status(200)
    .json({ status: "success", data: { message: "Upload was successful" } });
});

export const download = catchAsync(async (req, res, next) => {
  const { publicId, folder } = req.body;

  const url = getSignedCloudinaryUrl(publicId, folder);
  res.status(200).json({
    status: "success",
    data: { downloadUrl: url },
  });
});

export const deleteOne = catchAsync(async (req, res, next) => {
  const { fileId, publicId } = req.body;

  const result = await deleteFromCloudinary(publicId);

  if (result.result === "ok") {
    await deleteFileMetadata(fileId);

    res.status(204).json({
      status: "success",
    });
  } else {
    return next(new AppError("Not Found", 404));
  }
});

export const listAll = catchAsync(async (req, res, next) => {
  const { purpose } = req.body;
  const folder = `epe-delivery-dev/${purpose}`;
  const files = await listFromCloudinary(folder);

  res.status(200).json({
    status: "success",
    data: { files },
  });
});

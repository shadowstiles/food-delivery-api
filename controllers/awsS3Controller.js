import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import s3 from "../config/awsConfig.js";
import Category from "../models/categoryModel.js";
import Product from "../models/productModel.js";
import Restaurant from "../models/restaurantModel.js";
import Rider from "../models/riderModel.js";
import User from "../models/userModel.js";
import {
  deleteFileMetadata,
  saveFileMetadata,
} from "../services/fileService.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import validateFile from "../utils/fileValidator.js";

export const upload = catchAsync(async (req, res, next) => {
  const { entityId, purpose } = req.body;
  const { file } = req;

  // ✅ Validate
  validateFile(file, purpose);

  const key = `${purpose}/${req.user.role}/${entityId}/${Date.now()}-${file.originalname}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    })
  );

  const url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

  const saved = await saveFileMetadata({
    ownerId: entityId,
    ownerType: req.user.role.slice(0, -1),
    purpose,
    storage: "s3",
    fileKey: key,
    url,
    format: file.mimetype,
    size: file.size,
  });

  if (purpose.toLowerCase() === "passport") {
    const user = await User.findByIdAndUpdate(entityId, {
      profileImage: saved.url,
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
    data: { file: saved },
  });
});

export const bulkUpload = catchAsync(async (req, res, next) => {
  const { entityId, purpose } = req.body;
  const { files } = req;

  const results = await Promise.all(
    files.map(async (file) => {
      validateFile(file, purpose);

      const key = `${purpose}/${req.user.role}/${entityId}/${Date.now()}-${file.originalname}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        })
      );

      const url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

      const saved = await saveFileMetadata({
        ownerId: entityId,
        ownerType: req.user.role,
        purpose,
        storage: "s3",
        fileKey: key,
        url,
        format: file.mimetype,
        size: file.size,
      });

      if (purpose.toLowerCase() === "passport") {
        const user = await User.findByIdAndUpdate(entityId, {
          profileImage: saved.url,
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

      if (purpose.toLowerCase() === "restaurant") {
        const restaurant = await Restaurant.findByIdAndUpdate(entityId, {
          coverImage: saved.url,
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

      return saved; // resolve value for this file
    })
  );

  res.status(201).json({
    status: "status",
    data: { files: results },
  });
});

export const download = catchAsync(async (req, res, next) => {
  const { fileKey } = req.body;

  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: fileKey,
  });

  const downloadUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 mins

  res.status(200).json({
    status: "success",
    data: { downloadUrl },
  });
});

export const deleteOne = catchAsync(async (req, res, next) => {
  const { fileId, fileKey } = req.body;

  await s3.send(
    new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileKey,
    })
  );

  await deleteFileMetadata(fileId);

  res.status(204).json({
    status: "status",
    data: { deleted: fileKey },
  });
});

export const listAll = catchAsync(async (req, res, next) => {
  const { entityId, purpose } = req.body;

  const prefix = `${req.user.role}/${entityId}/${purpose}/`;

  const command = new ListObjectsV2Command({
    Bucket: process.env.AWS_S3_BUCKET,
    Prefix: prefix,
  });

  const data = await s3.send(command);

  const files = (data.Contents || []).map((obj) => ({
    key: obj.Key,
    size: obj.Size,
    lastModified: obj.LastModified,
    url: `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${obj.Key}`,
  }));

  res.status(200).json({
    status: "status",
    data: { files },
  });
});

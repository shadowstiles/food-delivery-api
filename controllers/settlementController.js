/* eslint-disable no-await-in-loop */
import mongoose from "mongoose";

import Order from "../models/orderModel.js";
import Settlement from "../models/settlementModel.js";
import { approveSettlement } from "../services/payoutService.js";
import {
  createVendorSettlementsFromOrder,
  createRiderSettlementsFromOrder,
  releaseDueSettlements,
} from "../services/settlementService.js";
import APIFeatures from "../utils/apiFeatures.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

export const getAllSettlementForUser = catchAsync(async (req, res, next) => {
  const { ownerId } = req.params;

  const features = new APIFeatures(
    Settlement.find({ owner: ownerId }),
    req.queryParams || req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const settlements = await features.query;

  if (!settlements) return next(new AppError("Wallet not found", 404));

  return res.status(200).json({
    status: "success",
    data: { data: settlements },
  });
});

export const getAllSettlements = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(
    Settlement.find(),
    req.queryParams || req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const settlements = await features.query;

  if (!settlements) return next(new AppError("No Settlement Found", 404));

  return res.status(200).json({
    status: "success",
    data: { data: settlements },
  });
});

export const generateVendorSettlements = catchAsync(async (req, res, next) => {
  const orders = await Order.find({ paymentStatus: "paid" });

  // eslint-disable-next-line no-restricted-syntax
  for (const order of orders) {
    const session = await mongoose.startSession();

    await session.withTransaction(async () => {
      await createVendorSettlementsFromOrder(order, session);
    });

    await session.endSession();
  }

  return res.status(200).json({
    status: "success",
    message: "Pending settlements for vendors generated",
  });
});

export const generateRiderSettlements = catchAsync(async (req, res, next) => {
  const orders = await Order.find({
    status: "delivered",
    paymentStatus: "paid",
  });

  // eslint-disable-next-line no-restricted-syntax
  for (const order of orders) {
    const session = await mongoose.startSession();

    await session.withTransaction(async () => {
      await createRiderSettlementsFromOrder(order, session);
    });

    await session.endSession();
  }

  return res.status(200).json({
    status: "success",
    message: "Pending settlements for riders generated",
  });
});

export const approveReadySettlement = catchAsync(async (req, res, next) => {
  const walletTransaction = await approveSettlement({
    settlementId: req.params.settlementId,
    adminId: req.user.id,
  });

  return res.status(200).json({
    status: "success",
    data: { data: walletTransaction },
  });
});

export const releaseDuePendingSettlements = catchAsync(async (req, res) => {
  const result = await releaseDueSettlements({
    limit: Number(req.query.limit || 100),
  });

  return res.status(200).json({
    status: "success",
    data: { data: result },
  });
});

import mongoose from "mongoose";

import Delivery from "../models/deliveryModel.js";
import Order from "../models/orderModel.js";
import {
  createRiderSettlementsFromOrder,
  createVendorSettlementsFromOrder,
} from "../services/settlementService.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

// 🔹 Create delivery (after order confirmed)
export const createDelivery = catchAsync(async (req, res, next) => {
  const { orderId, pickupLocation, dropoffLocation, notes } = req.body;

  // ensure order exists
  const order = await Order.findById(orderId);
  if (!order) return next(new AppError("Order not found", 404));

  // prevent duplicate delivery
  const exists = await Delivery.findOne({ order: orderId });
  if (exists)
    return next(new AppError("Delivery already created for this order", 400));

  const delivery = await Delivery.create({
    order: orderId,
    dropoffLocation,
    pickupLocation,
    notes,
    status: "pending",
  });

  res.status(201).json({
    status: "success",
    data: { data: delivery },
  });
});

// 🔹 Assign rider
export const assignRider = catchAsync(async (req, res, next) => {
  const { riderId } = req.body;

  const delivery = await Delivery.findById(req.params.id);
  if (!delivery) return next(new AppError("Delivery not found", 404));

  const order = await Order.findById(delivery.order);
  if (!order) return next(new AppError("Invalid Order attached delivery", 404));

  if (order.status === "pending") {
    return next(new AppError("Only paid Orders can be assigned", 404));
  }

  if (delivery.status !== "pending") {
    return next(new AppError("Delivery cannot be assigned at this stage", 400));
  }

  delivery.rider = riderId;

  await delivery.save();

  res.status(200).json({
    status: "success",
    data: { data: delivery },
  });
});

// 🔹 Update delivery status
export const updateDeliveryStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;

  const delivery = await Delivery.findById(req.params.id);
  if (!delivery) return next(new AppError("Delivery not found", 404));

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      if (status === "picked_up") {
        delivery.pickedUpAt = new Date();
      }

      if (status === "delivered") {
        delivery.deliveredAt = new Date();
      }

      delivery.status = status;
      await delivery.save({ session });

      if (status === "delivered") {
        const order = await Order.findById(delivery.order).session(session);
        if (!order) throw new AppError("Invalid Order attached delivery", 404);

        order.status = "delivered";
        order.deliveredAt = delivery.deliveredAt || new Date();
        if (order.paymentMethod === "cash") order.paymentStatus = "paid";
        await order.save({ session });

        if (order.paymentStatus === "paid") {
          await createVendorSettlementsFromOrder(order, session);
        }

        await createRiderSettlementsFromOrder(order, session);
      }
    });
  } finally {
    session.endSession();
  }

  res.status(200).json({
    status: "success",
    data: { data: delivery.status },
  });
});

// 🔹 Get delivery details
export const getDelivery = catchAsync(async (req, res, next) => {
  const delivery = await Delivery.findById(req.params.id)
    .populate("order")
    .populate("rider");

  if (!delivery) return next(new AppError("Delivery not found", 404));

  res.status(200).json({
    status: "success",
    data: { data: delivery },
  });
});

// 🔹 Get rider deliveries
export const getRiderDeliveries = catchAsync(async (req, res, next) => {
  const deliveries = await Delivery.find({
    rider: req.params.riderId,
  }).populate({
    path: "order",
    populate: {
      path: "user",
      select: "firstName lastName phoneNumber",
    },
  });

  res.status(200).json({
    status: "success",
    results: deliveries.length,
    data: {
      data: deliveries,
    },
  });
});

// 🔹 Cancel delivery
export const cancelDelivery = catchAsync(async (req, res, next) => {
  const delivery = await Delivery.findById(req.params.id);
  if (!delivery) return next(new AppError("Delivery not found", 404));

  if (["delivered", "cancelled"].includes(delivery.status)) {
    return next(new AppError("Cannot cancel at this stage", 400));
  }

  delivery.status = "cancelled";
  await delivery.save();

  res.status(200).json({
    status: "success",
    data: { data: delivery },
  });
});

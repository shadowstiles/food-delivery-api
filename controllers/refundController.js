// controllers/refundController.js
import Order from "../models/orderModel.js";
import Refund from "../models/refundModel.js";
import Transaction from "../models/transactionModel.js";
import * as refundService from "../services/refundService.js";
import APIFeatures from "../utils/apiFeatures.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

export const requestRefund = catchAsync(async (req, res, next) => {
  const { orderId, amount, reason, reference } = req.body;
  const userId = req.user.id;

  const refund = await refundService.requestRefund({
    orderId,
    userId,
    amount,
    reason,
    reference,
  });

  return res.json({ status: "success", data: refund });
});

export const approveRefund = catchAsync(async (req, res, next) => {
  const { refundId } = req.params;
  const adminUserId = req.user.id;
  // processRefund will call gateway and handle ledger
  const refund = await refundService.processRefund({ refundId, adminUserId });
  return res.json({ status: "success", data: refund });
});

export const getAllRefundRequest = catchAsync(async (req, res, next) => {
  const { orderId } = req.params;

  const features = new APIFeatures(Refund.findOne({ order: orderId }))
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const refunds = await features.query;

  if (!refunds) return next(new AppError("Refunds not found", 404));

  return res.status(200).json({
    status: "success",
    data: { refunds },
  });
});

export const processRefundByRefOrOrder = catchAsync(async (req, res, next) => {
  const { transactionReference, orderId, amount, reason, operatorNote } =
    req.body;

  const adminUserId = req.user?.id; // from auth middleware

  if (!transactionReference && !orderId) {
    return next(
      new AppError("Provide either transactionReference or orderId", 400)
    );
  }

  // 1. Locate transaction/order
  let origTxn = null;
  let order = null;

  if (transactionReference) {
    origTxn = await Transaction.findOne({ reference: transactionReference });

    if (!origTxn) throw new AppError("Transaction not found", 404);
    order = origTxn.order ? await Order.findById(origTxn.order) : null;
  } else if (orderId) {
    order = await Order.findById(orderId);
    if (!order) throw new AppError("Order not found", 404);
    origTxn = order.payment ? await Transaction.findById(order.payment) : null;
  }

  // 2. Check if refund already exists (idempotency)
  let refund = await Refund.findOne({
    $or: [{ originalTransaction: origTxn?._id }, { order: order?._id }],
    totalAmount: amount,
    status: { $in: ["processing", "success"] },
  });

  if (refund) {
    return res.status(200).json({
      status: "success",
      data: refund,
      message: "Refund already processed or in progress",
    });
  }

  if (!order) {
    return next(new AppError("Order not found for refund", 404));
  }

  refund = await refundService.requestRefund({
    orderId: order._id,
    userId: order.authId || order.userId,
    amount,
    reason,
    reference: `refund_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
  });

  const result = await refundService.processRefund({
    refundId: refund._id,
    adminUserId,
    operatorNote,
  });

  res.status(200).json({ status: "success", data: { result } });
});

export const rejectRefund = catchAsync(async (req, res, next) => {
  const { refundId } = req.params;
  const { reason } = req.body;
  const adminUserId = req.user?.id;

  const refund = await Refund.findById(refundId);
  if (!refund) throw new AppError("Refund not found", 404);

  // Only reject if still open
  if (!["requested", "approved"].includes(refund.status)) {
    throw new AppError("Refund cannot be rejected at this stage", 400);
  }

  refund.status = "rejected";
  refund.reason = reason || refund.reason;
  refund.approvedBy = adminUserId; // record the rejecting admin
  refund.history.push({
    status: "rejected",
    changedBy: adminUserId,
  });

  await refund.save();

  res.status(200).json({
    status: "success",
    message: "Refund rejected successfully",
    data: { refund },
  });
});

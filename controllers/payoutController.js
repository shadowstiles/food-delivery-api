import * as factory from "./handlerFactory.js";
import Payout from "../models/payoutModel.js";
import Rider from "../models/riderModel.js";
import Vendor from "../models/vendorModel.js";
import Wallet from "../models/walletModel.js";
import * as payoutService from "../services/payoutService.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

// ─────────────────────────────
// Request Withdrawal (User, Vendor and Rider)
// ─────────────────────────────
export const requestWithdrawal = catchAsync(async (req, res, next) => {
  const { walletId, amount, method, bankDetails } = req.body;

  const wallet = await Wallet.findById(walletId).select("owner ownerType");
  if (!wallet) return next(new AppError("Wallet not found", 404));

  if (req.user.role !== "admin") {
    const OwnerModel = wallet.ownerType === "Vendor" ? Vendor : Rider;
    const owner = await OwnerModel.findOne({
      _id: wallet.owner,
      authId: req.user.id,
    }).select("_id");

    if (!owner) {
      return next(new AppError("You cannot withdraw from this wallet", 403));
    }
  }

  const payout = await payoutService.requestWithdrawal({
    walletId,
    amount,
    method,
    bankDetails,
    userId: req.user.id,
  });

  res.status(201).json({
    status: "success",
    data: { data: payout },
  });
});

// ─────────────────────────────
// Process Payout (Admin)
// ─────────────────────────────
export const processPayout = catchAsync(async (req, res, next) => {
  const { payoutId } = req.params;

  const payout = await payoutService.processPayout(payoutId);

  res.status(200).json({
    status: "success",
    data: { data: payout },
  });
});

// ─────────────────────────────
// Retry Failed Payout (Admin)
// ─────────────────────────────
export const retryPayout = catchAsync(async (req, res, next) => {
  const { payoutId } = req.params;

  const payout = await payoutService.retryPayout(payoutId);

  res.status(200).json({
    status: "success",
    data: { data: payout },
  });
});

// ─────────────────────────────
// Get Single Payout
// ─────────────────────────────
export const getPayoutDetails = catchAsync(async (req, res, next) => {
  const payout = await Payout.findById(req.params.id)
    .populate("recipient")
    .populate("sourceWallet")
    .populate("destinationWallet")
    .populate("walletTransaction")
    .populate("settlement");

  if (!payout) {
    return next(new AppError("Payout not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: { data: payout },
  });
});

// ─────────────────────────────
// Get All Payouts (Admin)
// ─────────────────────────────
export const getAllPayouts = factory.getAll({ Model: Payout });

import mongoose from "mongoose";

import Order from "../models/orderModel.js";
import Rider from "../models/riderModel.js";
import User from "../models/userModel.js";
import Vendor from "../models/vendorModel.js";
import Wallet from "../models/walletModel.js";
import WalletTransaction from "../models/walletTransactionModel.js";
import { verifyWalletPayment } from "../services/paymentService.js";
import * as walletService from "../services/walletService.js";
import APIFeatures from "../utils/apiFeatures.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

export function generateWalletReference(prefix) {
  const now = new Date();

  const pad = (n) => n.toString().padStart(2, "0");

  const date =
    now.getFullYear().toString() + pad(now.getMonth() + 1) + pad(now.getDate());

  const time =
    pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());

  const random = Math.random().toString(36).substring(2, 8).toUpperCase();

  return `${prefix.toUpperCase()}-${date}-${time}-${random}`;
}

export function buildWalletMetadata({
  req,
  source,
  note,
  initiatedBy,
  initiatedById,
}) {
  return {
    source,
    note,
    initiatedBy,
    initiatedById,
    ip: req?.ip,
    userAgent: req?.headers?.["user-agent"],
    createdAt: new Date(),
  };
}

export function buildNarration({ type, amount, from, to, orderRef }) {
  switch (type) {
    case "transfer":
      return `Wallet transfer of ₦${amount} from ${from} to ${to}`;
    case "withdrawal":
      return `Withdrawal of ₦${amount}`;
    case "refund":
      return `Refund of ₦${amount} for order ${orderRef}`;
    case "deposite":
      return `Deposite of ₦${amount} `;
    case "commission":
      return `Platform commission of ₦${amount}`;
    default:
      return `${type} of ₦${amount}`;
  }
}

function capitalizeFirstLetter(word) {
  if (!word) return "";
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export const getWallet = catchAsync(async (req, res, next) => {
  const { role: type } = req.user;

  const ownerModelByRole = {
    vendor: Vendor,
    rider: Rider,
  };

  const OwnerModel = ownerModelByRole[type];
  if (!OwnerModel) {
    return next(new AppError("Wallets are disabled for this account type", 400));
  }

  const owner = await OwnerModel.findOne({ authId: req.user.id }).select(
    "+wallet"
  );
  if (!owner) return next(new AppError("Wallet owner profile not found", 404));

  let wallet = await Wallet.findOne({
    owner: owner._id,
    ownerType: capitalizeFirstLetter(type),
  });

  if (!wallet) {
    wallet = await Wallet.create({
      owner: owner._id,
      ownerType: capitalizeFirstLetter(type),
    }); // fresh wallet

    owner.wallet = wallet._id;
    await owner.save({ validateBeforeSave: false });
  }

  return res.status(200).json({ status: "success", data: { data: wallet } });
});

export const transferBtwWallets = catchAsync(async (req, res, next) => {
  const { amount, debitWallet, creditWallet, type, reversalOf, receiversName } =
    req.body;

  const narration = buildNarration({
    type: "transfer",
    amount,
    from: `${req.user.firstName.toUpperCase()}'s Wallet`,
    to: receiversName,
  });

  const reference = generateWalletReference("WT");

  const metadata = buildWalletMetadata({
    req,
    source: "wallet_transfer",
    note: req.body.narration,
    initiatedBy: req.user.role,
    initiatedById: req.user.id,
  });

  const session = await mongoose.startSession();

  const walletTx = await session.withTransaction(async () => {
    const debitWalletId = await walletService.resolveWalletIdentifier(
      debitWallet,
      session
    );

    const creditWalletId = await walletService.resolveWalletIdentifier(
      creditWallet,
      session
    );

    await walletService.assertWalletOwnership(debitWalletId, req.user, session);

    return await walletService.applyWalletTransactions({
      session,
      debitWalletId,
      creditWalletId,
      amount,
      type,
      reference,
      narration,
      metadata,
      reversalOf,
    });
  });

  return res.status(200).json({ status: "success", data: { data: walletTx } });
});

export const payOrderWithWallet = catchAsync(async (req, res, next) => {
  const {
    amount,
    debitWallet,
    creditWallet,
    type,
    narration,
    reversalOf,
    orderId,
  } = req.body;

  const reference = generateWalletReference("WD");

  const metadata = buildWalletMetadata({
    req,
    source: "wallet_debit",
    note: narration,
    initiatedBy: req.user.role,
    initiatedById: req.user.id,
  });

  const session = await mongoose.startSession();

  const walletTx = await session.withTransaction(async () => {
    const debitWalletId = await walletService.resolveWalletIdentifier(
      debitWallet,
      session
    );

    const creditWalletId = await walletService.resolveWalletIdentifier(
      creditWallet,
      session
    );

    await walletService.assertWalletOwnership(debitWalletId, req.user, session);

    return await walletService.applyWalletTransactions({
      session,
      debitWalletId,
      creditWalletId,
      amount,
      type,
      reference,
      narration,
      metadata,
      reversalOf,
    });
  });

  // Attach transaction to order
  await Order.findByIdAndUpdate(orderId, { walletPayment: walletTx._id });

  await verifyWalletPayment(reference);

  return res.status(200).json({ status: "success", data: { data: walletTx } });
});

export const creditUserWallet = catchAsync(async (req, res, next) => {
  const { amount, debitWallet, creditWallet, type, narration, reversalOf } =
    req.body;

  const reference = generateWalletReference("WC");

  const metadata = buildWalletMetadata({
    req,
    source: "wallet_credit",
    note: narration,
    initiatedBy: req.user.role,
    initiatedById: req.user.id,
  });

  const session = await mongoose.startSession();

  const walletTx = await session.withTransaction(async () => {
    const debitWalletId = await walletService.resolveWalletIdentifier(
      debitWallet,
      session
    );

    const creditWalletId = await walletService.resolveWalletIdentifier(
      creditWallet,
      session
    );

    await walletService.assertWalletOwnership(debitWalletId, req.user, session);

    return await walletService.applyWalletTransactions({
      session,
      debitWalletId,
      creditWalletId,
      amount,
      type,
      reference,
      narration,
      metadata,
      reversalOf,
    });
  });

  return res.status(200).json({ status: "success", data: { walletTx } });
});

export const freezAccount = catchAsync(async (req, res, next) => {
  const { walletId } = req.params;

  const wallet = await Wallet.findByIdAndUpdate(
    walletId,
    { status: "frozen" },
    { new: true }
  );
  if (!wallet) return next(new AppError("Wallet not found", 404));

  return res.status(200).json({
    status: "success",
    message: "Wallet Account has been frozen",
    data: { wallet },
  });
});

export const activateAccount = catchAsync(async (req, res, next) => {
  const { walletId } = req.params;

  const wallet = await Wallet.findByIdAndUpdate(
    walletId,
    { status: "active" },
    { new: true }
  );
  if (!wallet) return next(new AppError("Wallet not found", 404));

  return res.status(200).json({
    status: "success",
    message: "Wallet Account is now Active",
    data: { wallet },
  });
});

export const getAllTransactions = catchAsync(async (req, res, next) => {
  const { walletId } = req.params;

  const features = new APIFeatures(
    WalletTransaction.find({
      $or: [{ debitWallet: walletId }, { creditWallet: walletId }],
    }),
    req.queryParams || req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const transactions = await features.query;

  if (!transactions) return next(new AppError("transactions not found", 404));

  return res.status(200).json({
    status: "success",
    data: { data: transactions },
  });
});

export const checkBalance = catchAsync(async (req, res, next) => {
  const { walletId } = req.params;

  const wallet = await Wallet.findById(walletId);
  if (!wallet) return next(new AppError("Wallet not found", 404));

  return res.status(200).json({
    status: "success",
    data: { currentBalance: wallet.balance.available },
  });
});

export const getWalletName = catchAsync(async (req, res, next) => {
  const { walletNumber } = req.params;

  const wallet = await Wallet.findOne({ walletNumber });
  if (!wallet) return next(new AppError("Wallet Number not found", 404));

  const user = await User.findById(wallet.owner);
  if (!user)
    return next(new AppError("No User Assigned to this Wallet Number", 404));

  return res.status(200).json({
    status: "success",
    data: { currentUser: user.fullName },
  });
});

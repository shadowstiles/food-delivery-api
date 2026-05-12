import mongoose from "mongoose";

import {
  completeProcessingDebit,
  moveAvailableToProcessing,
  restoreProcessingToAvailable,
} from "./walletService.js";
import Payout from "../models/payoutModel.js";
import Settlement from "../models/settlementModel.js";
import Wallet from "../models/walletModel.js";
import WalletTransaction from "../models/walletTransactionModel.js";
import AppError from "../utils/appError.js";
import { initiateTransfer } from "../utils/gatewayClient.js";
import getPlatformSettings from "../utils/platformSettings.js";

// Releases a settlement by moving funds from pending to available.
export async function approveSettlement({ settlementId, adminId }) {
  const session = await mongoose.startSession();

  try {
    let walletTx;

    await session.withTransaction(async () => {
      const settlement =
        await Settlement.findById(settlementId).session(session);
      if (!settlement) throw new AppError("Settlement not found", 404);
      if (!["pending", "ready"].includes(settlement.status)) {
        throw new AppError("Settlement not approvable", 400);
      }

      const wallet = await Wallet.findById(settlement.wallet).session(session);
      if (!wallet) throw new AppError("Wallet not found", 404);
      wallet.balance.available ??= 0;
      wallet.balance.pending ??= 0;
      wallet.balance.processing ??= 0;
      if (wallet.balance.pending < settlement.netPayable) {
        throw new AppError("Insufficient pending settlement balance", 400);
      }

      const balanceBeforeCredit = wallet.balance.toObject();
      wallet.balance.pending -= settlement.netPayable;
      wallet.balance.available += settlement.netPayable;
      wallet.balance.book =
        wallet.balance.available +
        wallet.balance.pending +
        wallet.balance.processing;

      [walletTx] = await WalletTransaction.create(
        [
          {
            creditWallet: wallet._id,
            amount: settlement.netPayable,
            type: "settlement",
            direction: "credit",
            category: "earning",
            reference: `settlement_${settlement._id}`,
            idempotencyKey: `settlement_${settlement._id}`,
            metadata: {
              approvedBy: adminId,
              order: settlement.order,
              settlement: settlement._id,
            },
            status: "success",
            balanceBeforeCredit,
            balanceAfterCredit: wallet.balance.toObject(),
          },
        ],
        { session }
      );

      wallet.lastTransaction = walletTx._id;
      await wallet.save({ session });

      settlement.status = "available";
      settlement.releasedAt = new Date();
      settlement.walletTransaction = walletTx._id;
      await settlement.save({ session });
    });

    return walletTx;
  } finally {
    session.endSession();
  }
}

export async function requestWithdrawal({
  walletId,
  amount,
  method,
  bankDetails,
  userId,
}) {
  const withdrawalAmount = Number(amount);

  if (!Number.isFinite(withdrawalAmount) || withdrawalAmount <= 0) {
    throw new AppError("Invalid withdrawal amount", 400);
  }

  if (!["monnify", "flutterwave"].includes(method)) {
    throw new AppError("Unsupported payout method", 400);
  }

  const session = await mongoose.startSession();

  try {
    return await session.withTransaction(async () => {
      const wallet = await Wallet.findById(walletId).session(session);
      if (!wallet) throw new AppError("Wallet not found", 404);
      wallet.balance.available ??= 0;
      wallet.balance.pending ??= 0;
      wallet.balance.processing ??= 0;
      if (wallet.ownerType === "User") {
        throw new AppError("Customer wallet withdrawals are disabled", 400);
      }
      if (wallet.status !== "active")
        throw new AppError("Wallet inactive", 400);

      await moveAvailableToProcessing({
        session,
        walletId,
        amount: withdrawalAmount,
      });

      const cachedSettings = await getPlatformSettings();

      const [payout] = await Payout.create(
        [
          {
            sourceWallet: cachedSettings.platformWallet,
            recipient: wallet.owner,
            recipientType: wallet.ownerType,
            destinationWallet: wallet._id,
            amount: withdrawalAmount,
            currency: wallet.currency,
            method,
            reference: `wd_${wallet._id}_${Date.now()}`,
            status: "pending",
            bankDetails,
            metadata: {
              requestedBy: userId,
            },
          },
        ],
        { session }
      );

      return payout;
    });
  } finally {
    session.endSession();
  }
}

export async function processPayout(payoutId) {
  let payout = await Payout.findById(payoutId);
  if (!payout) throw new AppError("Payout not found", 404);
  if (["paid", "success"].includes(payout.status)) return payout;
  if (!["pending", "approved", "failed"].includes(payout.status)) {
    throw new AppError("Payout is already processing", 409);
  }

  payout.status = "processing";
  payout.failureReason = undefined;
  await payout.save();

  let gatewayResp;

  try {
    gatewayResp = await initiateTransfer({
      reference: payout.reference,
      amount: payout.amount,
      method: payout.method,
      bankDetails: payout.bankDetails || payout.metadata?.bankDetails,
    });
  } catch (err) {
    gatewayResp = {
      success: false,
      error: err.message,
      rawResponse: err.response?.data || null,
    };
  }

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      payout = await Payout.findById(payoutId).session(session);
      if (!payout) throw new AppError("Payout not found", 404);
      if (["paid", "success"].includes(payout.status)) return;

      if (!gatewayResp.success) {
        await restoreProcessingToAvailable({
          session,
          walletId: payout.destinationWallet,
          amount: payout.amount,
        });

        payout.status = "failed";
        payout.failureReason = gatewayResp.error;
        payout.metadata = {
          ...(payout.metadata || {}),
          gatewayResponse: gatewayResp.rawResponse,
        };
        await payout.save({ session });
        return;
      }

      const { wallet, before, after } = await completeProcessingDebit({
        session,
        walletId: payout.destinationWallet,
        amount: payout.amount,
      });

      const [walletTx] = await WalletTransaction.create(
        [
          {
            debitWallet: wallet._id,
            amount: payout.amount,
            type: "withdrawal",
            direction: "debit",
            category: "withdrawal",
            reference: payout.reference,
            idempotencyKey: payout.reference,
            payout: payout._id,
            status: "success",
            balanceBeforeDebit: before,
            balanceAfterDebit: after,
          },
        ],
        { session }
      );

      wallet.lastTransaction = walletTx._id;
      await wallet.save({ session });

      payout.walletTransaction = walletTx._id;
      payout.status = "paid";
      payout.providerReference =
        gatewayResp.providerReference || gatewayResp.transferCode;
      payout.metadata = {
        ...(payout.metadata || {}),
        gatewayResponse: gatewayResp.rawResponse,
      };
      await payout.save({ session });
    });
  } finally {
    session.endSession();
  }

  return Payout.findById(payoutId);
}

export async function retryPayout(payoutId) {
  const payout = await Payout.findById(payoutId);
  if (!payout) throw new AppError("Payout not found", 404);
  if (payout.status !== "failed") {
    throw new AppError("Only failed payouts can be retried", 400);
  }

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      await moveAvailableToProcessing({
        session,
        walletId: payout.destinationWallet,
        amount: payout.amount,
      });

      payout.status = "approved";
      payout.failureReason = null;
      payout.retryCount += 1;
      payout.lastRetryAt = new Date();
      await payout.save({ session });
    });
  } finally {
    session.endSession();
  }

  return processPayout(payoutId);
}

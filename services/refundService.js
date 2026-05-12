import mongoose from "mongoose";

import { applyWalletTransactions } from "./walletService.js";
import Order from "../models/orderModel.js";
import Refund from "../models/refundModel.js";
import Rider from "../models/riderModel.js";
import Transaction from "../models/transactionModel.js";
import User from "../models/userModel.js";
import Vendor from "../models/vendorModel.js";
import Wallet from "../models/walletModel.js";
import AppError from "../utils/appError.js";
import * as gateway from "../utils/gatewayClient.js";
import getPlatformSettings from "../utils/platformSettings.js";

async function findOrderParticipantWallets(order, session) {
  const [customer, vendor, rider, settings] = await Promise.all([
    order.userId
      ? User.findById(order.userId).select("_id").session(session)
      : User.findOne({ authId: order.authId }).select("_id").session(session),
    Vendor.findOne({ restaurants: order.storeId })
      .select("_id wallet")
      .session(session),
    order.riderId
      ? Rider.findById(order.riderId).select("_id wallet").session(session)
      : null,
    getPlatformSettings(),
  ]);

  if (!customer) throw new AppError("Order customer profile not found", 404);

  const [userWallet, vendorWallet, riderWallet, platformWallet] =
    await Promise.all([
      Wallet.findOne({ owner: customer._id, ownerType: "User" }).session(
        session
      ),
      vendor
        ? Wallet.findOne({ owner: vendor._id, ownerType: "Vendor" }).session(
            session
          )
        : null,
      rider
        ? Wallet.findOne({ owner: rider._id, ownerType: "Rider" }).session(
            session
          )
        : null,
      Wallet.findById(settings.platformWallet).session(session),
    ]);

  if (!userWallet) throw new AppError("Customer wallet not found", 404);
  if (!platformWallet) throw new AppError("Platform wallet not found", 404);

  return {
    customer,
    userWallet,
    vendorWallet,
    riderWallet,
    platformWallet,
  };
}

// Calculate a proportional liability split from the immutable finance values
// stored on the order at checkout/delivery time.
function calculateRefundSplit({ amount, order }) {
  const vendorEarning = order.restaurantFinance?.restaurantPayout || 0;
  const riderEarning = order.deliveryFinance?.riderPayout || 0;
  const platformCommission =
    (order.restaurantFinance?.commissionAmount || 0) +
    (order.deliveryFinance?.platformEarning || 0);

  const total = vendorEarning + riderEarning + platformCommission;

  if (total <= 0) {
    return {
      vendor: 0,
      rider: 0,
      platform: amount,
    };
  }

  const ratio = amount / total;

  return {
    vendor: Math.round(vendorEarning * ratio),
    rider: Math.round(riderEarning * ratio),
    platform:
      amount -
      Math.round(vendorEarning * ratio) -
      Math.round(riderEarning * ratio),
  };
}

// User requests a refund. This only creates the auditable refund request; money
// moves later after approval.
export async function requestRefund({
  orderId,
  userId,
  amount,
  reason,
  reference,
}) {
  const session = await mongoose.startSession();

  try {
    return await session.withTransaction(async () => {
      const order = await Order.findById(orderId).session(session);
      if (!order) throw new AppError("Order not found", 404);

      const ownerId = order.authId || order.userId;
      if (ownerId?.toString() !== userId.toString()) {
        throw new AppError("Not order owner", 403);
      }

      const refundAmount = Number(amount);
      if (
        !Number.isInteger(refundAmount) ||
        refundAmount <= 0 ||
        refundAmount > order.total
      ) {
        throw new AppError("Invalid refund amount", 400);
      }

      if (reference) {
        const existing = await Refund.findOne({ reference }).session(session);
        if (existing) return existing;
      }

      const wallets = await findOrderParticipantWallets(order, session);

      const [refund] = await Refund.create(
        [
          {
            order: order._id,
            originalTransaction: order.payment || null,
            totalAmount: refundAmount,
            currency: order.currency || "NGN",
            method: "wallet",
            split: calculateRefundSplit({ amount: refundAmount, order }),
            vendorWallet: wallets.vendorWallet?._id,
            riderWallet: wallets.riderWallet?._id,
            userWallet: wallets.userWallet._id,
            platformWallet: wallets.platformWallet._id,
            reason,
            initiatedBy: "user",
            requestedBy: wallets.customer._id,
            status: "requested",
            reference,
          },
        ],
        { session }
      );

      return refund;
    });
  } finally {
    session.endSession();
  }
}

// Admin/system approval changes workflow state only. Ledger movement is handled
// by executeRefund so approval remains reversible until execution.
export async function approveRefund({ refundId, adminId }) {
  const refund = await Refund.findById(refundId);
  if (!refund) throw new AppError("Refund not found", 404);

  if (refund.status !== "requested") {
    throw new AppError("Refund not in requested state", 400);
  }

  refund.status = "approved";
  refund.approvedBy = adminId;
  refund.history.push({
    status: "approved",
    changedBy: adminId,
  });

  await refund.save();
  return refund;
}

// Execute approved refund through wallet ledger entries inside one transaction.
export async function executeRefund({ refundId }) {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      const refund = await Refund.findById(refundId).session(session);
      if (!refund) throw new AppError("Refund not found", 404);

      if (refund.status === "success") {
        result = refund;
        return;
      }

      if (refund.status !== "approved") {
        throw new AppError("Refund not approved", 400);
      }

      refund.status = "processing";
      await refund.save({ session });

      // Load wallets
      const [vendorWallet, riderWallet, userWallet, platformWallet] =
        await Promise.all([
          refund.vendorWallet
            ? Wallet.findById(refund.vendorWallet).session(session)
            : null,
          refund.riderWallet
            ? Wallet.findById(refund.riderWallet).session(session)
            : null,
          Wallet.findById(refund.userWallet).session(session),
          Wallet.findById(refund.platformWallet).session(session),
        ]);

      // ─────────────────────────────
      // INTERNAL LEDGER REVERSALS
      // ─────────────────────────────

      if (refund.split.vendor > 0) {
        if (!vendorWallet) {
          throw new AppError("Vendor wallet not found", 404);
        }

        const tx = await applyWalletTransactions({
          session,
          debitWalletId: vendorWallet._id,
          creditWalletId: platformWallet._id,
          amount: refund.split.vendor,
          type: "refund",
          reference: `${refund.reference}_vendor`,
          metadata: { refundId: refund._id },
        });
        refund.walletTransactions.push(tx._id);
      }

      if (refund.split.rider > 0) {
        if (!riderWallet) {
          throw new AppError("Rider wallet not found", 404);
        }

        const tx = await applyWalletTransactions({
          session,
          debitWalletId: riderWallet._id,
          creditWalletId: platformWallet._id,
          amount: refund.split.rider,
          type: "refund",
          reference: `${refund.reference}_rider`,
          metadata: { refundId: refund._id },
        });
        refund.walletTransactions.push(tx._id);
      }

      // Platform → User
      const userTx = await applyWalletTransactions({
        session,
        debitWalletId: platformWallet._id,
        creditWalletId: userWallet._id,
        amount: refund.totalAmount,
        type: "refund",
        reference: `${refund.reference}_user`,
        metadata: { refundId: refund._id },
      });
      refund.walletTransactions.push(userTx._id);

      refund.status = "success";
      refund.processedAt = new Date();
      await refund.save({ session });

      result = refund;
    });

    return result;
  } finally {
    session.endSession();
  }
}

// Optional external gateway refund. Internal ledger success is not rolled back
// if a bank/card refund provider is temporarily unavailable.
export async function processGatewayRefund(refundId) {
  const refund = await Refund.findById(refundId).populate(
    "originalTransaction"
  );
  if (!refund) throw new AppError("Refund not found", 404);

  const txn = refund.originalTransaction;
  if (!txn || txn.paymentMethod === "wallet") return refund;

  try {
    const resp = await gateway.refundPayment(txn.id, {
      gateway: txn.paymentMethod,
      reference: txn.reference,
      amount: refund.totalAmount,
      refundReference: refund.reference,
    });

    refund.gatewayResponse = resp.rawResponse;
    await refund.save();
  } catch (err) {
    // 🚨 DO NOT ROLLBACK LEDGER
    refund.gatewayResponse = { error: err.message };
    await refund.save();
  }

  return refund;
}

// Chargeback webhook creates an approved system refund and executes the same
// wallet reversal path used by manual refunds.
export async function handleChargeback({ payload }) {
  const reference =
    payload?.data?.reference || payload?.data?.tx_ref || payload?.data?.flw_ref;

  const txn = await Transaction.findOne({ reference });
  if (!txn) throw new AppError("Unknown chargeback transaction", 404);

  const order = await Order.findById(txn.order);
  if (!order) throw new AppError("Order not found", 404);

  const session = await mongoose.startSession();

  let refund;

  try {
    await session.withTransaction(async () => {
      const wallets = await findOrderParticipantWallets(order, session);

      [refund] = await Refund.create(
        [
          {
            order: order._id,
            originalTransaction: txn._id,
            totalAmount: txn.amount,
            currency: txn.currency,
            method: "card",
            split: calculateRefundSplit({ amount: txn.amount, order }),
            vendorWallet: wallets.vendorWallet?._id,
            riderWallet: wallets.riderWallet?._id,
            userWallet: wallets.userWallet._id,
            platformWallet: wallets.platformWallet._id,
            initiatedBy: "platform",
            status: "approved",
            reference: `chargeback_${reference}`,
            metadata: payload,
          },
        ],
        { session }
      );
    });
  } finally {
    session.endSession();
  }

  await executeRefund({ refundId: refund._id });
  return refund;
}

export async function processRefund({ refundId, adminUserId }) {
  await approveRefund({ refundId, adminId: adminUserId });
  return executeRefund({ refundId });
}

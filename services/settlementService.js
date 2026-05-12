/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import mongoose from "mongoose";

import Rider from "../models/riderModel.js";
import Settlement from "../models/settlementModel.js";
import Vendor from "../models/vendorModel.js";
import Wallet from "../models/walletModel.js";
import WalletTransaction from "../models/walletTransactionModel.js";
import AppError from "../utils/appError.js";
import getPlatformSettings from "../utils/platformSettings.js";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function releaseDateForOwner(ownerType) {
  const delayDays =
    ownerType === "Rider"
      ? Number(process.env.RIDER_SETTLEMENT_RELEASE_DAYS ?? 1)
      : Number(process.env.VENDOR_SETTLEMENT_RELEASE_DAYS ?? 1);

  return new Date(Date.now() + Math.max(0, delayDays) * ONE_DAY_MS);
}

function buildSettlementKey(ownerType, orderId, ownerId) {
  return `${ownerType.toUpperCase()}:${orderId}:${ownerId}`;
}

// Capture the order values used for settlement so future order edits do not
// change the historical payout/audit record.
function buildOrderSnapshot(order, extra = {}) {
  return {
    orderTotal: order.total || 0,
    subtotal: order.subtotal || 0,
    deliveryFee: order.deliveryFee || 0,
    serviceFee: order.serviceFee || 0,
    discountAmount: order.discountAmount || 0,
    storeName: order.storeName,
    ...extra,
  };
}

// Wallets are created lazily for vendors/riders so settlement creation is not
// blocked by older profiles that predate wallet support.
async function ensureOwnerWallet(owner, ownerType, session) {
  if (owner.wallet) return owner.wallet;

  let wallet = await Wallet.findOne({ owner: owner._id, ownerType }).session(
    session
  );

  if (!wallet) {
    [wallet] = await Wallet.create(
      [
        {
          owner: owner._id,
          ownerType,
          currency: "NGN",
        },
      ],
      { session }
    );
  }

  owner.wallet = wallet._id;
  await owner.save({ session, validateBeforeSave: false });

  return wallet._id;
}

// Settlement creation and wallet pending-credit are one atomic operation.
// Duplicate-key errors are treated as idempotent retries.
async function persistSettlementAndCreditPending(settlement, session) {
  try {
    const [createdSettlement] = await Settlement.create([settlement], {
      session,
    });

    await Wallet.updateOne(
      { _id: settlement.wallet },
      {
        $inc: {
          "balance.pending": settlement.netPayable,
          "balance.book": settlement.netPayable,
        },
      },
      { session }
    );

    return createdSettlement;
  } catch (err) {
    if (err?.code === 11000) return null;
    throw err;
  }
}

function buildBaseSettlement({ owner, ownerType, wallet, order, orderId }) {
  return {
    settlementKey: buildSettlementKey(ownerType, order._id, owner._id),
    owner: owner._id,
    ownerType,
    wallet,
    order: order._id,
    orderId,
    status: "pending",
    releaseAt: releaseDateForOwner(ownerType),
    period: {
      from: order.createdAt,
      to: order.updatedAt,
    },
  };
}

// Create the vendor earning for a paid order using fields that exist on
// orderModel: storeId and restaurantFinance.
export async function createVendorSettlementsFromOrder(order, session) {
  if (order.paymentStatus !== "paid") return;

  const orderId = order.orderNumber || order.orderId;

  if (!order.storeId) return;

  const vendor = await Vendor.findOne({
    restaurants: order.storeId,
  }).session(session);

  if (!vendor) return;

  const wallet = await ensureOwnerWallet(vendor, "Vendor", session);
  const grossAmount = order.subtotal || 0;
  const cachedSettings = await getPlatformSettings();
  const commissionRate =
    order.restaurantFinance?.commissionRate ??
    order.storeCommission ??
    cachedSettings.restaurantCommissionRate ??
    0;
  const platformFee =
    order.restaurantFinance?.commissionAmount ??
    Math.round((grossAmount * commissionRate) / 100);
  const netPayable =
    order.restaurantFinance?.restaurantPayout ?? grossAmount - platformFee;

  await persistSettlementAndCreditPending(
    {
      ...buildBaseSettlement({
        owner: vendor,
        ownerType: "Vendor",
        wallet,
        order,
        orderId,
      }),
      grossAmount,
      platformFee,
      netPayable,
      breakdown: {
        commissionRate,
      },
      snapshot: buildOrderSnapshot(order),
    },
    session
  );
}

// Create the rider earning once an order is delivered and paid, using the
// deliveryFinance snapshot already stored on the order.
export async function createRiderSettlementsFromOrder(order, session) {
  if (order.status !== "delivered" || order.paymentStatus !== "paid") return;

  const orderId = order.orderNumber || order.orderId;

  if (!order.riderId) return;

  const rider = await Rider.findById(order.riderId).session(session);
  if (!rider) return;

  const wallet = await ensureOwnerWallet(rider, "Rider", session);
  const grossAmount = order.deliveryFee || 0;
  const cachedSettings = await getPlatformSettings();
  const commissionRate =
    order.deliveryFinance?.platformRate ??
    cachedSettings.riderCommissionRate ??
    0;
  const platformFee =
    order.deliveryFinance?.platformEarning ??
    Math.round((grossAmount * commissionRate) / 100);
  const netPayable =
    order.deliveryFinance?.riderPayout ?? grossAmount - platformFee;

  await persistSettlementAndCreditPending(
    {
      ...buildBaseSettlement({
        owner: rider,
        ownerType: "Rider",
        wallet,
        order,
        orderId,
      }),
      grossAmount,
      platformFee,
      netPayable,
      breakdown: {
        commissionRate,
        deliveryFee: order.deliveryFee,
      },
      snapshot: buildOrderSnapshot(order, {
        riderName: rider.fullName || rider.name,
      }),
    },
    session
  );
}

// Release due settlements from pending to available balances. This is safe for
// a cron/job runner because every settlement is re-read by id and status inside
// its own transaction before money moves.
export async function releaseDueSettlements({
  now = new Date(),
  limit = 100,
} = {}) {
  const dueSettlements = await Settlement.find({
    status: "pending",
    releaseAt: { $lte: now },
  })
    .sort({ releaseAt: 1 })
    .limit(limit);

  let released = 0;

  for (const settlement of dueSettlements) {
    const session = await mongoose.startSession();

    try {
      const didRelease = await session.withTransaction(async () => {
        const lockedSettlement = await Settlement.findOne({
          _id: settlement._id,
          status: "pending",
        }).session(session);

        if (!lockedSettlement) return false;

        const wallet = await Wallet.findById(lockedSettlement.wallet).session(
          session
        );

        if (!wallet) throw new AppError("Wallet not found", 404);
        wallet.balance.available ??= 0;
        wallet.balance.pending ??= 0;
        wallet.balance.processing ??= 0;

        if (wallet.balance.pending < lockedSettlement.netPayable) {
          throw new AppError("Insufficient pending settlement balance", 400);
        }

        const balanceBeforeCredit = wallet.balance.toObject();
        wallet.balance.pending -= lockedSettlement.netPayable;
        wallet.balance.available += lockedSettlement.netPayable;
        wallet.balance.book =
          wallet.balance.available +
          wallet.balance.pending +
          wallet.balance.processing;

        const [walletTx] = await WalletTransaction.create(
          [
            {
              creditWallet: wallet._id,
              amount: lockedSettlement.netPayable,
              type: "settlement",
              direction: "credit",
              category: "earning",
              reference: `settlement_release_${lockedSettlement._id}`,
              idempotencyKey: `settlement_release_${lockedSettlement._id}`,
              metadata: {
                order: lockedSettlement.order,
                settlement: lockedSettlement._id,
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

        lockedSettlement.status = "available";
        lockedSettlement.releasedAt = now;
        lockedSettlement.walletTransaction = walletTx._id;
        await lockedSettlement.save({ session });
        return true;
      });

      if (didRelease) released += 1;
    } finally {
      session.endSession();
    }
  }

  return { released };
}

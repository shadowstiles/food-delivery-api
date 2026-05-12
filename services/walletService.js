import mongoose from "mongoose";

import Wallet from "../models/walletModel.js";
import WalletTransaction from "../models/walletTransactionModel.js";
import AppError from "../utils/appError.js";
import getPlatformSettings from "../utils/platformSettings.js";

function normalizeWalletBalance(wallet) {
  if (!wallet?.balance) return;

  wallet.balance.available ??= 0;
  wallet.balance.pending ??= 0;
  wallet.balance.processing ??= 0;
  wallet.balance.book ??=
    wallet.balance.available + wallet.balance.pending + wallet.balance.processing;
}

export async function resolveWalletIdentifier(identifier, session) {
  if (!identifier) return null;

  // Mongo ObjectId
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    return identifier;
  }

  // Wallet Number (10-digit)
  if (/^\d{10}$/.test(identifier)) {
    const wallet = await Wallet.findOne({ walletNumber: identifier })
      .select("_id")
      .session(session);

    if (!wallet) {
      throw new AppError("Wallet not found", 404);
    }

    return wallet._id;
  }

  throw new AppError("Invalid wallet identifier", 400);
}

export async function assertWalletOwnership(walletId, user, session) {
  if (!walletId) return;

  const wallet = await Wallet.findById(walletId)
    .select("ownerType owner status")
    .session(session);

  if (!wallet) {
    throw new AppError("Wallet not found", 404);
  }

  if (wallet.status !== "active") {
    throw new AppError("Wallet is not active", 400);
  }

  // Users, Vendors and Riders can only operate on THEIR wallets
  if (
    (wallet.ownerType === "User" ||
      wallet.ownerType === "Vendor" ||
      wallet.ownerType === "Rider") &&
    wallet.owner.toString() !== user._id.toString()
  ) {
    throw new AppError("Unauthorized wallet access", 403);
  }

  return wallet;
}

export async function applyWalletTransactions({
  session,
  debitWalletId = null,
  creditWalletId = null,
  amount,
  type,
  reference,
  narration,
  metadata,
  order,
  transaction,
  payout,
  reversalOf,
}) {
  if (!session) {
    throw new AppError("Session required for wallet transaction", 500);
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError("Invalid amount", 400);
  }

  if (!Number.isInteger(amount)) {
    throw new AppError("Amount must be an integer minor currency unit", 400);
  }

  if (!debitWalletId && !creditWalletId) {
    throw new AppError("At least one wallet required", 400);
  }

  const cachedSettings = await getPlatformSettings();

  // 🔐 Idempotency
  if (reference) {
    const existing = await WalletTransaction.findOne({ reference }).session(
      session
    );

    if (existing) {
      if (existing.status === "success") return existing;
      throw new AppError("Transaction already processing", 409);
    }
  }

  const [debitWallet, creditWallet] = await Promise.all([
    debitWalletId ? Wallet.findById(debitWalletId).session(session) : null,
    creditWalletId ? Wallet.findById(creditWalletId).session(session) : null,
  ]);

  if (debitWallet && debitWallet.status !== "active")
    throw new AppError("Debit wallet inactive", 400);

  if (creditWallet && creditWallet.status !== "active")
    throw new AppError("Credit wallet inactive", 400);

  normalizeWalletBalance(debitWallet);
  normalizeWalletBalance(creditWallet);

  // Participant wallets cannot go negative. Platform/admin wallets may carry
  // operational liabilities during reconciliation.
  if (
    debitWallet &&
    debitWallet.ownerType !== "Admin" &&
    debitWallet.balance.available < amount
  ) {
    throw new AppError("Insufficient balance", 400);
  }

  // 🧾 Create ledger record FIRST
  const [walletTx] = await WalletTransaction.create(
    [
      {
        amount,
        debitWallet: debitWallet?._id,
        creditWallet: creditWallet?._id,
        type,
        reference,
        narration,
        metadata,
        order,
        transaction,
        payout,
        reversalOf,
        direction: debitWalletId && !creditWalletId ? "debit" : "credit",
        category: type,
        status: "pending",
        balanceBeforeDebit: debitWallet?.balance?.toObject?.() ?? debitWallet?.balance,
        balanceBeforeCredit:
          creditWallet?.balance?.toObject?.() ?? creditWallet?.balance,
      },
    ],
    { session }
  ).then((r) => r);

  // 💰 Apply balances
  if (debitWallet) {
    debitWallet.balance.available -= amount;
    debitWallet.balance.book =
      debitWallet.balance.available +
      debitWallet.balance.pending +
      debitWallet.balance.processing;
    debitWallet.lastTransaction = walletTx._id;
    await debitWallet.save({ session });

    walletTx.balanceAfterDebit = debitWallet.balance;
  }

  if (creditWallet) {
    const beforeCredit = creditWallet.balance.available;

    creditWallet.balance.available += amount;
    creditWallet.balance.book =
      creditWallet.balance.available +
      creditWallet.balance.pending +
      creditWallet.balance.processing;
    creditWallet.lastTransaction = walletTx._id;
    await creditWallet.save({ session });

    walletTx.balanceAfterCredit = creditWallet.balance;

    // ✅ AUTO DEBT RECOVERY
    if (beforeCredit < 0 && amount > 0) {
      const recovery = Math.min(amount, Math.abs(beforeCredit));

      await WalletTransaction.create(
        [
          {
            amount: recovery,
            debitWallet: creditWallet._id,
            creditWallet: cachedSettings.platformWallet,
            type: "debt_recovery",
            metadata: {
              sourceWalletTransaction: walletTx._id,
            },
            status: "success",
          },
        ],
        { session }
      );

      creditWallet.balance.available -= recovery;
      creditWallet.balance.book -= recovery;
      await creditWallet.save({ session });
    }
  }

  walletTx.status = "success";
  walletTx.completedAt = new Date();
  await walletTx.save({ session });

  return walletTx;
}

export async function reverseWalletTransaction({
  originalTransactionId,
  reason,
  reference,
}) {
  const session = await mongoose.startSession();

  try {
    return await session.withTransaction(async () => {
      const original =
        await WalletTransaction.findById(originalTransactionId).session(
          session
        );

      if (!original || original.status !== "success") {
        throw new AppError("Invalid transaction to reverse", 400);
      }

      return applyWalletTransactions({
        session,
        debitWalletId: original.creditWallet,
        creditWalletId: original.debitWallet,
        amount: original.amount,
        type: "refund",
        reversalOf: original._id,
        reference,
        metadata: { reason },
      });
    });
  } finally {
    session.endSession();
  }
}

// admin only
export async function adjustWallet({ walletId, amount, actorId, reason }) {
  if (!actorId) throw new AppError("Admin required", 403);

  const session = await mongoose.startSession();

  try {
    return await session.withTransaction(async () =>
      applyWalletTransactions({
        session,
        debitWalletId: amount < 0 ? walletId : null,
        creditWalletId: amount > 0 ? walletId : null,
        amount: Math.abs(amount),
        type: "adjustment",
        metadata: { reason, admin: actorId },
      })
    );
  } finally {
    session.endSession();
  }
}

export async function moveAvailableToProcessing({
  session,
  walletId,
  amount,
}) {
  if (!session) throw new AppError("Session required", 500);
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new AppError("Invalid amount", 400);
  }

  const wallet = await Wallet.findById(walletId).session(session);
  if (!wallet) throw new AppError("Wallet not found", 404);
  normalizeWalletBalance(wallet);
  if (wallet.status !== "active") throw new AppError("Wallet inactive", 400);
  if (wallet.balance.available < amount) {
    throw new AppError("Insufficient available balance", 400);
  }

  wallet.balance.available -= amount;
  wallet.balance.processing += amount;
  wallet.balance.book =
    wallet.balance.available +
    wallet.balance.pending +
    wallet.balance.processing;

  await wallet.save({ session });
  return wallet;
}

export async function completeProcessingDebit({ session, walletId, amount }) {
  if (!session) throw new AppError("Session required", 500);

  const wallet = await Wallet.findById(walletId).session(session);
  if (!wallet) throw new AppError("Wallet not found", 404);
  normalizeWalletBalance(wallet);
  if (wallet.balance.processing < amount) {
    throw new AppError("Insufficient processing balance", 400);
  }

  const before = wallet.balance.toObject();
  wallet.balance.processing -= amount;
  wallet.balance.book =
    wallet.balance.available +
    wallet.balance.pending +
    wallet.balance.processing;

  await wallet.save({ session });
  return { wallet, before, after: wallet.balance.toObject() };
}

export async function restoreProcessingToAvailable({
  session,
  walletId,
  amount,
}) {
  if (!session) throw new AppError("Session required", 500);

  const wallet = await Wallet.findById(walletId).session(session);
  if (!wallet) throw new AppError("Wallet not found", 404);
  normalizeWalletBalance(wallet);
  if (wallet.balance.processing < amount) {
    throw new AppError("Insufficient processing balance", 400);
  }

  wallet.balance.processing -= amount;
  wallet.balance.available += amount;
  wallet.balance.book =
    wallet.balance.available +
    wallet.balance.pending +
    wallet.balance.processing;

  await wallet.save({ session });
  return wallet;
}

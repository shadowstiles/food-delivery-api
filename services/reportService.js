import Payout from "../models/payoutModel.js";
import Refund from "../models/refundModel.js";
import Settlement from "../models/settlementModel.js";
import Transaction from "../models/transactionModel.js";
import WalletTransaction from "../models/walletTransactionModel.js";

export async function walletActivityReport({ ownerId, start, end }) {
  return WalletTransaction.find({
    $or: [{ debitWallet: ownerId }, { creditWallet: ownerId }],
    createdAt: { $gte: start, $lte: end },
  })
    .populate("debitWallet creditWallet")
    .sort({ createdAt: -1 });
}

export async function transactionReport({ start, end, paymentMethod }) {
  const filter = { createdAt: { $gte: start, $lte: end } };
  if (paymentMethod) filter.paymentMethod = paymentMethod;

  return Transaction.find(filter)
    .populate("order wallet user")
    .sort({ createdAt: -1 });
}

export async function refundReport({ start, end, status }) {
  const filter = { createdAt: { $gte: start, $lte: end } };
  if (status) filter.status = status;

  return Refund.find(filter)
    .populate("order transaction requestedBy")
    .sort({ createdAt: -1 });
}

export async function settlementReport({ ownerId, start, end, status }) {
  const filter = {
    owner: ownerId,
    createdAt: { $gte: start, $lte: end },
  };

  if (status) filter.status = status;

  return Settlement.find(filter).populate("wallet").sort({ createdAt: -1 });
}

export async function payoutReport({ recipientId, start, end, status }) {
  const filter = {
    recipient: recipientId,
    createdAt: { $gte: start, $lte: end },
  };

  if (status) filter.status = status;

  return Payout.find(filter)
    .populate("walletTransaction")
    .sort({ createdAt: -1 });
}

// Aggregation: sum of credits/debits by type & period
export async function dailyCashflowSummary(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return WalletTransaction.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end }, status: "success" } },
    {
      $group: {
        _id: "$type",
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);
}

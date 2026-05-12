import axios from "axios";
import mongoose from "mongoose";

import {
  createVendorSettlementsFromOrder,
  createRiderSettlementsFromOrder,
} from "./settlementService.js";
import { applyWalletTransactions } from "./walletService.js";
import Order from "../models/orderModel.js";
import Transaction from "../models/transactionModel.js";
import Wallet from "../models/walletModel.js";
import WalletTransaction from "../models/walletTransactionModel.js";
import AppError from "../utils/appError.js";
import getPlatformSettings from "../utils/platformSettings.js";

async function getMonnifyToken() {
  const auth = Buffer.from(
    `${process.env.MONNIFY_API_KEY}:${process.env.MONNIFY_SECRET_KEY}`
  ).toString("base64");

  const res = await axios.post(
    "https://api.monnify.com/api/v1/auth/login",
    {},
    {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    }
  );

  if (!res.data?.responseBody?.accessToken) {
    throw new AppError("Failed to authenticate with Monnify", 400);
  }

  return res.data.responseBody.accessToken;
}

export async function initiatePayment({
  amount,
  currency,
  user,
  orderId,
  wallet,
  reference,
  paymentMethod,
}) {
  const session = await mongoose.startSession();

  try {
    return await session.withTransaction(async () => {
      // Prevent duplicate reference
      const existing = await Transaction.findOne({ reference }).session(
        session
      );
      if (existing) {
        throw new AppError("Reference already exists", 400);
      }

      // Create pending transaction
      if (wallet) {
        await Transaction.create(
          [
            {
              authUser: user._id,
              wallet,
              amount,
              currency,
              type: "credit",
              paymentMethod,
              status: "pending",
              reference,
            },
          ],
          { session }
        );
      }

      if (orderId) {
        const txn = await Transaction.create(
          [
            {
              authUser: user._id,
              order: orderId,
              amount,
              currency,
              type: "credit",
              paymentMethod,
              status: "pending",
              reference,
            },
          ],
          { session }
        );

        const transaction = txn[0];

        // Attach transaction to order
        await Order.findByIdAndUpdate(
          orderId,
          {
            payment: transaction._id,
            paymentReference: reference,
            paymentMethod,
          },
          { session }
        );
      }

      let checkoutUrl;
      let monnifyPayload;

      /* =========================
         FLUTTERWAVE INIT
      ========================== */
      if (paymentMethod === "flutterwave") {
        const res = await axios.post(
          "https://api.flutterwave.com/v3/payments",
          {
            tx_ref: reference,
            amount,
            currency,
            redirect_url: `${process.env.APP_URL}/api/v1/payments/verify?reference=${reference}&paymentMethod=flutterwave`,
            customer: {
              email: user.email,
              name: user.fullName || user.email,
            },
            meta: {
              orderId,
              userId: user._id.toString(),
            },
            customizations: {
              title: "Order Payment",
              description: `Payment for order ${reference}`,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
            },
          }
        );

        if (!res.data?.data?.link) {
          throw new AppError("Flutterwave initialization failed", 400);
        }

        checkoutUrl = res.data.data.link;
      } else if (paymentMethod === "paystack") {
        /* =========================
         PAYSTACK INIT
      ========================== */
        const res = await axios.post(
          "https://api.paystack.co/transaction/initialize",
          {
            email: user.email,
            amount: Math.round(Number(amount) * 100),
            currency,
            reference,
            callback_url: `${process.env.APP_URL}/api/v1/payments/verify?reference=${reference}&paymentMethod=paystack`,
            metadata: {
              orderId,
              userId: user._id.toString(),
            },
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!res.data?.data?.authorization_url) {
          throw new AppError("Paystack initialization failed", 400);
        }

        checkoutUrl = res.data.data.authorization_url;
      } else if (paymentMethod === "monnify") {
        /* =========================
         MONNIFY INIT
      ========================== */
        const token = await getMonnifyToken();

        monnifyPayload = {
          amount: Number(amount),
          currency,
          reference,
          customerName: user.fullName || user.email,
          customerEmail: user.email,
          paymentDescription: `Payment for ${reference}`,
          contractCode: process.env.MONNIFY_CONTRACT_CODE,
          apiKey: process.env.MONNIFY_API_KEY,
          metadata: [
            {
              name: "orderId",
              value: orderId,
            },
            {
              name: "userId",
              value: user._id.toString(),
            },
          ],
        };

        const res = await axios.post(
          process.env.NODE_ENV === "production"
            ? "https://api.monnify.com/api/v1/vendor/transactions/init-transaction"
            : "https://sandbox.monnify.com/api/v1/vendor/transactions/init-transaction",
          {
            amount: Number(amount),
            customerName: user.fullName || user.email,
            customerEmail: user.email,
            paymentReference: reference,
            paymentDescription: `Order payment ${reference}`,
            currencyCode: currency,
            contractCode: process.env.MONNIFY_CONTRACT_CODE,
            redirectUrl: `${process.env.APP_URL}/api/v1/payments/verify?reference=${reference}&paymentMethod=monnify`,
            paymentMethods: ["CARD", "ACCOUNT_TRANSFER", "USSD"],
            metadata: [
              {
                name: "orderId",
                value: orderId,
              },
              {
                name: "userId",
                value: user._id.toString(),
              },
            ],
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!res.data?.responseBody?.checkoutUrl) {
          throw new AppError("Monnify initialization failed", 400);
        }

        // eslint-disable-next-line prefer-destructuring
        checkoutUrl = res.data.responseBody.checkoutUrl;
      } else {
        throw new AppError("Unsupported payment method", 400);
      }

      return {
        checkoutUrl,
        monnify: paymentMethod === "monnify" ? monnifyPayload : null,
      };
    });
    // eslint-disable-next-line no-useless-catch
  } catch (error) {
    throw error;
  } finally {
    session.endSession();
  }
}

export async function verifyPayment(reference, paymentMethod) {
  const session = await mongoose.startSession();

  try {
    return await session.withTransaction(async () => {
      const txn = await Transaction.findOne({ reference }).session(session);
      if (!txn) throw new AppError("Transaction not found", 404);

      // Idempotency is enforced by wallet transaction references and
      // settlement keys below, so retries can repair partially completed flows.

      let status;
      let gatewayResponse;

      /* =========================
         FLUTTERWAVE VERIFICATION
      ========================== */
      if (paymentMethod === "flutterwave") {
        const res = await axios.get(
          "https://api.flutterwave.com/v3/transactions/verify_by_reference",
          {
            params: {
              tx_ref: reference,
            },
            headers: {
              Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
            },
          }
        );

        if (!res.data?.data) {
          throw new AppError("Invalid Flutterwave response", 400);
        }

        const { data } = res.data;

        // Amount check
        if (Number(data.amount) !== Number(txn.amount)) {
          throw new AppError("Amount mismatch", 400);
        }

        // Currency check (optional but recommended)
        if (data.currency !== txn.currency) {
          throw new AppError("Currency mismatch", 400);
        }

        status = data.status === "successful" ? "paid" : "failed";
        gatewayResponse = res.data;
      } else if (paymentMethod === "paystack") {
        /* =========================
         PAYSTACK VERIFICATION
      ========================== */
        const res = await axios.get(
          `https://api.paystack.co/transaction/verify/${reference}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            },
          }
        );

        if (!res.data?.status || !res.data?.data) {
          throw new AppError("Invalid Paystack response", 400);
        }

        const { data } = res.data;

        // Paystack returns amount in kobo
        if (Number(data.amount) !== Math.trunc(Number(txn.amount) * 100)) {
          throw new AppError("Amount mismatch", 400);
        }

        if (data.currency !== txn.currency) {
          throw new AppError("Currency mismatch", 400);
        }

        status = data.status === "success" ? "paid" : "failed";

        gatewayResponse = res.data;
      } else if (paymentMethod === "monnify") {
        /* =========================
         MONNIFY VERIFICATION
      ========================== */
        const token = await getMonnifyToken();

        const res = await axios.get(
          process.env.NODE_ENV === "production"
            ? "https://api.monnify.com/api/v2/vendor/transactions/query"
            : "https://sandbox.monnify.com/api/v2/vendor/transactions/query",
          {
            params: {
              paymentReference: reference,
            },
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!res.data?.responseBody) {
          throw new AppError("Invalid Monnify response", 400);
        }

        const data = res.data.responseBody;

        if (Number(data.amountPaid) !== Number(txn.amount)) {
          throw new AppError("Amount mismatch", 400);
        }

        if (data.currency !== txn.currency) {
          throw new AppError("Currency mismatch", 400);
        }

        status =
          data.paymentStatus === "PAID" || data.paymentStatus === "SUCCESS"
            ? "paid"
            : "failed";

        gatewayResponse = res.data;
      } else {
        /* =========================
         UNSUPPORTED METHOD
      ========================== */
        throw new AppError("Unsupported payment method", 400);
      }

      if (!status) {
        throw new AppError("Unable to determine payment status", 400);
      }

      /* =========================
         UPDATE TRANSACTION
      ========================== */
      txn.status = status;
      txn.gatewayResponse = gatewayResponse;
      txn.processedAt = new Date();
      await txn.save({ session });

      let order;

      if (txn.order) {
        order = await Order.findById(txn.order).session(session);
        if (!order) throw new AppError("Order not found", 404);

        /* =========================
         HANDLE FAILED PAYMENT ORDER
      ========================== */
        if (status === "failed") {
          order.paymentStatus = "failed";
          await order.save({ session });
          return txn;
        }

        /* =========================
         HANDLE SUCCESS PAYMENT ORDER
      ========================== */
        order.paymentStatus = "paid";
        await order.save({ session });
      }

      const cachedSettings = await getPlatformSettings();

      const platformWallet = await Wallet.findById(
        cachedSettings.platformWallet
      ).session(session);

      if (!platformWallet) {
        throw new AppError("Platform wallet not found", 404);
      }

      await applyWalletTransactions({
        session,
        creditWalletId: platformWallet._id,
        amount: txn.amount,
        type: "deposit",
        transaction: txn._id,
        reference: `platform_${reference}`,
      });

      if (order) {
        await createVendorSettlementsFromOrder(order, session);

        if (order.status === "delivered") {
          await createRiderSettlementsFromOrder(order, session);
        }
      }

      return txn;
    });
    // eslint-disable-next-line no-useless-catch
  } catch (err) {
    // console.log(err?.data);
    throw err;
  } finally {
    session.endSession();
  }
}

export async function verifyWalletPayment(reference) {
  const session = await mongoose.startSession();

  try {
    return await session.withTransaction(async () => {
      const txn = await WalletTransaction.findOne({ reference }).session(
        session
      );

      if (!txn) throw new AppError("Wallet Transaction not found", 404);

      const order = await Order.findOne({ walletPayment: txn._id }).session(
        session
      );
      if (!order) throw new AppError("Order not found", 404);

      txn.order = order._id;
      await txn.save({ session });

      /* =========================
         HANDLE FAILED PAYMENT ORDER
      ========================== */
      if (txn.status === "failed") {
        order.paymentStatus = "failed";
        await order.save({ session });
        return txn;
      }

      /* =========================
         HANDLE SUCCESS PAYMENT ORDER
      ========================== */
      order.paymentStatus = "paid";
      await order.save({ session });

      if (order) {
        await createVendorSettlementsFromOrder(order, session);

        if (order.status === "delivered") {
          await createRiderSettlementsFromOrder(order, session);
        }
      }

      return txn;
    });
    // eslint-disable-next-line no-useless-catch
  } catch (err) {
    throw err;
  } finally {
    session.endSession();
  }
}

export async function reconcilePendingPayments(hours = 24) {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

  const txns = await Transaction.find({
    status: "pending",
    createdAt: { $lte: cutoff },
  });

  // eslint-disable-next-line no-restricted-syntax
  for (const txn of txns) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await verifyPayment(txn.reference, txn.paymentMethod);
    } catch (e) {
      // log only
    }
  }
}

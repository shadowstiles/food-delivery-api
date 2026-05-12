import axios from "axios";

import Order from "../models/orderModel.js";
import Transaction from "../models/transactionModel.js";
import User from "../models/userModel.js";
import * as paymentService from "../services/paymentService.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import { flw } from "../utils/flutterwave.js";
import { genRef } from "../utils/formatPayment.js";

export const initiatePayment = catchAsync(async (req, res, next) => {
  const { orderId, paymentMethod } = req.body;
  const reference = req.body.reference || genRef("order");

  if (!["flutterwave", "monnify", "monnify"].includes(paymentMethod)) {
    return next(new AppError("Unsupported payment method", 400));
  }

  if (!orderId) return next(new AppError("Order is required", 400));

  const order = await Order.findOne({ _id: orderId, authId: req.user.id });
  if (!order) return next(new AppError("Order not found", 404));

  if (order.paymentStatus === "paid") {
    return next(new AppError("Order has already been paid", 400));
  }

  const result = await paymentService.initiatePayment({
    amount: order.total,
    currency: order.currency || "NGN",
    user: req.user,
    orderId,
    reference,
    paymentMethod,
  });

  order.paymentUrl = result.checkoutUrl;

  await order.save({ validateBeforeSave: false });

  res.status(200).json({ status: "success", data: { data: result } });
});

export const paymentCallback = catchAsync(async (req, res, next) => {
  const { reference, paymentMethod } = req.query;

  if (!reference || !paymentMethod) {
    return next(
      new AppError("Missing reference or paymentMethod in query", 400)
    );
  }

  const txn = await paymentService.verifyPayment(reference, paymentMethod);

  if (req.headers.accept?.includes("text/html")) {
    return res.send(`
    <html>
      <body>
        <h2>Payment received. You can return to the Epe Delivery app.</h2>
      </body>
    </html>
  `);
  }

  return res.status(200).json({ status: "success", data: { data: txn } });
});

export const paymentWalletCallback = catchAsync(async (req, res, next) => {
  const { reference } = req.query;

  if (!reference) {
    return next(new AppError("Missing reference in query", 400));
  }

  const txn = await paymentService.verifyWalletPayment(reference);

  if (req.headers.accept?.includes("text/html")) {
    return res.send(`
    <html>
      <body>
        <h2>Payment received. You can return to the Epe Delivery app.</h2>
      </body>
    </html>
  `);
  }

  return res.status(200).json({ status: "success", data: { data: txn } });
});

export const refundPayment = catchAsync(async (req, res, next) => {
  const { transactionId } = req.params;

  const txn = await paymentService.refundPayment(transactionId);

  res.status.json({ status: "success", data: { txn } });
});

export const initiateCardSave = catchAsync(async (req, res, next) => {
  const { user } = req;
  if (!user) return next(new AppError("Unauthorized", 401));

  const { paymentMethod, orderId } = req.body;

  // Make amount small (test), or let client choose; for tokenization a small charge is common.
  const amount = req.body.amount ?? 100; // NGN 100 test charge
  const reference = genRef("cardsave");
  let finalResponse;

  // Create pending transaction
  const txn = await Transaction.create({
    authUser: user.id,
    order: orderId,
    amount,
    currency: "NGN",
    type: "debit",
    paymentMethod,
    status: "pending",
    reference,
    meta: { purpose: "card_save" },
  });

  // Request gateway checkout URL or payment initiation
  if (paymentMethod === "flutterwave") {
    const resp = await axios.post(
      "https://api.flutterwave.com/v3/payments",
      {
        tx_ref: reference,
        amount,
        currency: "NGN",
        redirect_url: `${process.env.APP_URL}/payment/callback`,
        customer: {
          id: user.id,
          email: user.email,
          name: user.fullName || user.email,
        },
        payment_options: "card", // force card only
        // you can add meta/narration if desired
        narration: "Save card for future payments - Epe Delivery",
      },
      { headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` } }
    );

    finalResponse = { transaction: txn, checkoutUrl: resp.data.data.link };
  }

  if (paymentMethod === "monnify") {
    const resp = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: "user@example.com",
        amount: amount * 100, // kobo
        reference,
        callback_url: `${process.env.APP_URL}/payment/callback`,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    finalResponse = {
      transaction: txn,
      checkoutUrl: resp.data.data.authorization_url,
    };
  }

  res.status(200).json({
    status: "success",
    data: { data: finalResponse },
  });
});

export const listUserCards = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id).select("cards");

  res.status(200).json({ status: "success", data: { data: user.cards || [] } });
});

export const deleteCard = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const user = await User.findById(req.user._id);

  if (!user) return next(new AppError("User not found", 404));

  const idx = user.cards.findIndex((c) => c._id.toString() === id);

  if (idx === -1) return next(new AppError("Card not found", 404));

  user.cards.splice(idx, 1);
  // If default removed, set another one default
  if (!user.cards.some((c) => c.default) && user.cards.length)
    user.cards[0].default = true;

  await user.save({ validateBeforeSave: false });

  res.status(200).json({ status: "success", data: { data: user.cards } });
});

export const setDefaultCard = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const user = await User.findById(req.user._id);
  if (!user) return next(new AppError("User not found", 404));

  let found = false;
  user.cards = user.cards.map((c) => {
    if (c._id.toString() === id) {
      found = true;
      return { ...c.toObject(), default: true };
    }
    return { ...c.toObject(), default: false };
  });
  if (!found) return next(new AppError("Card not found", 404));

  await user.save({ validateBeforeSave: false });

  res.status(200).json({ status: "success", data: { data: user.cards } });
});

export const paymentWithSavedCard = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  const { amount, cardId, orderId } = req.body;
  if (!amount || !cardId)
    return next(new AppError("Missing amount or cardId", 400));

  const card = user.cards.find((c) => c._id.toString() === cardId);
  if (!card) return next(new AppError("Card not found", 404));

  // Create a pending wallet transaction record
  const reference = genRef("WALLETTU");

  // Create pending transaction
  const txn = await Transaction.create({
    authUser: user.id,
    order: orderId,
    amount,
    currency: "NGN",
    paymentMethod: card.provider || "flutterwave",
    status: "pending",
    reference,
    meta: { purpose: "saved_card_payment", cardId: card._id },
  });

  // Use tokenized charge endpoint via SDK
  // SDK example (from docs): flw.Tokenized.charge(details)
  // details must include: token, currency, country, amount, email, tx_ref, narration
  const details = {
    token: card.authorizationCode,
    currency: "NGN",
    country: "NG",
    amount,
    email: user.email,
    tx_ref: reference,
    narration: "Wallet topup - Epe Delivery",
  };

  // Make tokenized charge
  const chargeResp = await flw.Tokenized.charge(details);
  const chargeData = chargeResp?.data ?? chargeResp;

  // If the charge is immediate and successful, verify; else wait for webhook.
  if (
    chargeData?.status === "success" &&
    (chargeData?.data?.status === "successful" ||
      chargeData.data?.status === "succeeded")
  ) {
    // Update pending record -> success & update wallet
    txn.status = "success";
    txn.meta = { ...txn.meta, flwResponse: chargeData };
    await txn.save();

    return res.status(200).json({
      status: "success",
      message: "Payment Successful",
    });
  }

  // If tokenized charge returned pending (3DS or OTP), we return the response to client to handle redirect or further validation.
  res.status(200).json({
    status: "success",
    message: "Payment initiated - awaiting confirmation",
  });
});

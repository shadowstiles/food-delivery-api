import mongoose from "mongoose";

import * as factory from "./handlerFactory.js";
import Transaction from "../models/transactionModel.js";
import APIFeatures from "../utils/apiFeatures.js";
import catchAsync from "../utils/catchAsync.js";

const isObjectId = (val) => mongoose.Types.ObjectId.isValid(val);

export const getAllTransaction = factory.getAll({ Model: Transaction });

export const getFilteredTransaction = catchAsync(async (req, res, next) => {
  const {
    search, // single text field
    transactionType,
    paymentMethod,
    status,
  } = req.query;

  const filter = {};

  // 🔹 Smart search handling
  if (search) {
    if (!isObjectId(search)) {
      // Assume reference
      filter.reference = search;
    } else {
      filter.$or = [{ order: search }, { user: search }];
    }
  }

  // 🔹 Optional filters
  if (transactionType) filter.type = transactionType;
  if (paymentMethod) filter.paymentMethod = paymentMethod;
  if (status) filter.status = status;

  const features = new APIFeatures(
    Transaction.find(filter),
    req.queryParams || req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const transactions = await features.query;

  // SEND RESPONSE
  res.status(200).json({
    status: "success",
    results: transactions.length,
    data: { data: transactions },
  });
});

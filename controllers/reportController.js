import * as reportService from "../services/reportService.js";
import catchAsync from "../utils/catchAsync.js";

export const getWalletActivity = catchAsync(async (req, res, next) => {
  const { start, end } = req.query;

  const report = await reportService.walletActivityReport({
    ownerId: req.user.id,
    ownerType: req.user.role,
    start: new Date(start),
    end: new Date(end),
  });

  res.status(200).json({ status: "success", data: report });
});

export const getTransactionReport = catchAsync(async (req, res, next) => {
  const { start, end, paymentMethod } = req.query;

  const report = await reportService.transactionReport({
    start: new Date(start),
    end: new Date(end),
    paymentMethod,
  });
  res.status(200).json({ status: "success", data: { report } });
});

export const getRefundReport = catchAsync(async (req, res, next) => {
  const { start, end, status } = req.query;

  const report = await reportService.refundReport({
    start: new Date(start),
    end: new Date(end),
    status,
  });
  res.status(200).json({ status: "success", data: { report } });
});

export const getSettlementReport = catchAsync(async (req, res, next) => {
  const { start, end } = req.query;
  const { ownerId } = req.params;

  const report = await reportService.settlementReport({
    ownerId,
    start: new Date(start),
    end: new Date(end),
  });

  res.status(200).json({ status: "success", data: { report } });
});

export const getPayoutReport = catchAsync(async (req, res, next) => {
  const { start, end } = req.query;
  const { recipientId } = req.params;

  const report = await reportService.payoutReport({
    recipientId,
    start: new Date(start),
    end: new Date(end),
  });

  res.status(200).json({ status: "success", data: { report } });
});

export const getDailyCashflowSummaryReport = catchAsync(
  async (req, res, next) => {
    const { date } = req.query;

    const report = await reportService.dailyCashflowSummary({
      date,
    });

    res.status(200).json({ status: "success", data: { report } });
  }
);

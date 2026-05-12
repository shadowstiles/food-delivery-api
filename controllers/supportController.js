import contactSettingsModel from "../models/contactSettingsModel.js";
import supportTicketModel from "../models/supportTicketModel.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

// ==========================================
// GET CONTACT SETTINGS
// ==========================================
export const getContactSettings = catchAsync(async (req, res, next) => {
  const settings = await contactSettingsModel.findOne();

  res.status(200).json({
    success: true,
    data: settings,
  });
});

// ==========================================
// CREATE OR UPDATE CONTACT SETTINGS
// ==========================================
export const upsertContactSettings = catchAsync(async (req, res, next) => {
  const {
    whatsappNumber,
    facebookUrl,
    instagramUrl,
    twitterUrl,
    supportEmail,
  } = req.body;

  let settings = await contactSettingsModel.findOne();

  if (settings) {
    settings.whatsappNumber = whatsappNumber;

    settings.facebookUrl = facebookUrl;

    settings.instagramUrl = instagramUrl;

    settings.twitterUrl = twitterUrl;

    settings.supportEmail = supportEmail;

    await settings.save();
  } else {
    settings = await contactSettingsModel.create({
      whatsappNumber,
      facebookUrl,
      instagramUrl,
      twitterUrl,
      supportEmail,
    });
  }

  res.status(200).json({
    success: true,
    message: "Contact settings updated successfully",
    data: settings,
  });
});

// ==========================================
// CREATE SUPPORT TICKET
// ==========================================
export const createSupportTicket = catchAsync(async (req, res, next) => {
  const { email, problem } = req.body;

  if (!email || !problem) {
    return next(new AppError("Email and problem are required", 400));
  }

  const ticket = await supportTicketModel.create({
    user: req.user?._id,
    email,
    problem,
  });

  res.status(201).json({
    success: true,
    message:
      "Complaint submitted successfully. Support will contact you via email.",
    data: ticket,
  });
});

// ==========================================
// GET ALL SUPPORT TICKETS
// ==========================================
export const getAllSupportTickets = catchAsync(async (req, res, next) => {
  const tickets = await supportTicketModel.find().sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    results: tickets.length,
    data: tickets,
  });
});

// ==========================================
// GET SINGLE SUPPORT TICKET
// ==========================================
export const getSingleSupportTicket = catchAsync(async (req, res, next) => {
  const ticket = await supportTicketModel.findById(req.params.id);

  if (!ticket) {
    return next(new AppError("Support ticket not found", 404));
  }

  res.status(200).json({
    success: true,
    data: ticket,
  });
});

// ==========================================
// RESOLVE SUPPORT TICKET
// ==========================================
export const resolveSupportTicket = catchAsync(async (req, res, next) => {
  const { adminReply } = req.body;

  const ticket = await supportTicketModel.findById(req.params.id);

  if (!ticket) {
    return next(new AppError("Support ticket not found", 404));
  }

  ticket.status = "resolved";

  ticket.adminReply = adminReply;

  ticket.resolvedAt = new Date();

  await ticket.save();

  res.status(200).json({
    success: true,
    message: "Support ticket resolved successfully",
    data: ticket,
  });
});

// ==========================================
// DELETE SUPPORT TICKET
// ==========================================
export const deleteSupportTicket = catchAsync(async (req, res, next) => {
  const ticket = await supportTicketModel.findByIdAndDelete(req.params.id);

  if (!ticket) {
    return next(new AppError("Support ticket not found", 404));
  }

  res.status(200).json({
    success: true,
    message: "Support ticket deleted successfully",
  });
});

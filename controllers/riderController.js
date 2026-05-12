import * as factory from "./handlerFactory.js";
import Auth from "../models/authModel.js";
import Rider from "../models/riderModel.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

// ====================================================
// 🔹 PHASE 1 — Base CRUD (Already available)
// ====================================================
export const getAllRiders = factory.getAll({ Model: Rider });
export const getRider = factory.getOne(Rider, "rider");
export const deleteRider = factory.deleteOne(Rider, "rider");
export const updateRider = factory.updateOne(Rider, "rider");

export const getRiderByUserId = catchAsync(async (req, res, next) => {
  const rider = await Rider.findOne({ authId: req.params.id });

  if (!rider) {
    return next(new AppError(`No Rider found with that ID`, 404));
  }

  res.status(200).json({
    status: "success",
    data: { data: rider },
  });
});

// Auto-attach user to rider for nested routes
export const setRiderUserIds = (req, res, next) => {
  if (!req.body.rider) req.body.rider = req.params.riderId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

// 🔹 Restricted create (user becomes a rider)
export const createRider = catchAsync(async (req, res, next) => {
  const existing = await Rider.findOne({ authId: req.user.id });

  if (existing)
    return next(new AppError("You already have a rider profile.", 400));

  const rider = await Rider.create({
    authId: req.user.id,
    firstName: req.body.firstName || req.user.firstName || "Rider",
    nin: req.body.nin,
    onboardingStage: 0,
    employmentStatus: "pending",
  });

  await Auth.findByIdAndUpdate(req.user.id, { role: "rider" });

  res.status(201).json({ status: "success", data: { data: rider } });
});

// 🔹 Restricted create (user becomes a rider)
export const updateNIN = catchAsync(async (req, res, next) => {
  await Rider.findOneAndUpdate(
    { authId: req.user.id },
    { nin: req.body.nin, onboardingStage: req.body.onboardingStage ?? 0 },
    { runValidators: true }
  );

  res
    .status(200)
    .json({ status: "success", data: { message: "NIN added successfully" } });
});

// 🔹 Vehicle Details
export const updateVehicleInfo = catchAsync(async (req, res, next) => {
  await Rider.findOneAndUpdate(
    { authId: req.user.id },
    {
      onboardingStage: req.body.onboardingStage ?? 1,
      vehicle: {
        type: req.body.type,
        registrationNumber: req.body.registrationNumber,
        model: req.body.model,
        year: req.body.year,
        color: req.body.color,
      },
    },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    status: "success",
    data: { message: "Vehicle Info added successfully" },
  });
});

// 🔹 Guarantors
export const addGuarantors = catchAsync(async (req, res, next) => {
  await Rider.findOneAndUpdate(
    { authId: req.user.id },
    {
      onboardingStage: req.body.onboardingStage ?? 2,
      guarantors: [
        {
          name: req.body.name,
          relationship: req.body.relationship,
          phoneNumber: req.body.phoneNumber,
          address: req.body.address,
          idType: req.body.idType,
          idNumber: req.body.idNumber,
        },
      ],
    },
    { runValidators: true }
  );

  res.status(200).json({
    status: "success",
    data: { message: "Gurantor added successfully" },
  });
});

// 🔹 Next of Kin
export const addNextOfKin = catchAsync(async (req, res, next) => {
  await Rider.findOneAndUpdate(
    { authId: req.user.id },
    {
      onboardingStage: req.body.onboardingStage ?? 3,
      nextOfKin: {
        name: req.body.name,
        relationship: req.body.relationship,
        phoneNumber: req.body.phoneNumber,
        address: req.body.address,
      },
    },
    { runValidators: true }
  );

  res.status(200).json({
    status: "success",
    data: { message: "Next of Kin details updated successfully" },
  });
});

// 🔹 Update other details (Bank, Documents)
export const updateBankAndDocumentsData = catchAsync(async (req, res, next) => {
  const rider = await Rider.findOneAndUpdate(
    { authId: req.user.id },
    {
      onboardingStage: req.body.onboardingStage ?? 4,
      bankDetails: {
        bankName: req.body.bankName,
        accountName: req.body.accountName,
        accountNumber: req.body.accountNumber,
      },

      driversLicense: {
        number: req.body.driversLicenseNumber,
        expiry: req.body.driversLicenseExpiryDate,
      },

      insurance: {
        provider: req.body.insuranceProvider,
        policyNumber: req.body.insurancePolicyNumber,
        expiry: req.body.insuranceExpiryDate,
      },
    },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    status: "success",
    data: {
      data: {
        bankDetails: rider.bankDetails,
        driversLicense: rider.driversLicense,
        insurance: rider.insurance,
      },
    },
  });
});

// 🔹 Background Check Consent
export const submitBackgroundCheck = catchAsync(async (req, res, next) => {
  const rider = await Rider.findOneAndUpdate(
    { authId: req.user.id },
    {
      onboardingStage: req.body.onboardingStage ?? 5,
      backgroundCheck: {
        submitted: true,
        status: "pending",
        provider: req.body.provider || "manual",
      },
    },
    { new: true, runValidators: true }
  );

  // (Planing to integrate external API here in the future: Youverify / Prembly)
  res.status(200).json({
    status: "success",
    data: { status: rider.backgroundCheck.status },
  });
});

// 🔹 Training Completion
export const completeTraining = catchAsync(async (req, res, next) => {
  const rider = await Rider.findOneAndUpdate(
    { authId: req.user.id },
    {
      onboardingStage: req.body.onboardingStage ?? 6,
      training: {
        completed: true,
        completedAt: Date.now(),
        score: req.body.score || null,
      },
    },
    { new: true, runValidators: true }
  );

  res.status(200).json({ status: "success", data: { status: rider.training } });
});

// 🔹 Delivery Bag
export const updateDeliveryBag = catchAsync(async (req, res, next) => {
  const rider = await Rider.findOneAndUpdate(
    { authId: req.user.id },
    {
      deliveryBag: {
        issued: req.body.issued,
        depositAmount: req.body.depositAmount,
        issueDate: req.body.issueDate,
      },
    },
    { new: true, runValidators: true }
  );

  res
    .status(200)
    .json({ status: "success", data: { deliveryBag: rider.deliveryBag } });
});

// 🔹 Rider goes online/offline
export const setAvailabilityStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;

  if (!["available", "onDelivery", "offline"].includes(status))
    return next(new AppError("Invalid availability status"));

  await Rider.findOneAndUpdate(
    { authId: req.user.id },
    { availabilityStatus: status },
    { new: true }
  );

  res
    .status(200)
    .json({ status: "success", data: { message: "status updated" } });
});

// 🔹 Update real-time location
export const updateRiderLocation = catchAsync(async (req, res, next) => {
  const { lat, lng } = req.body;

  if (!lat || !lng)
    return next(new AppError("Latitude and longitude required."));

  const rider = await Rider.findOneAndUpdate(
    { authId: req.user.id },
    {
      location: {
        type: "Point",
        coordinates: [lng, lat],
      },
      lastActive: Date.now(),
    },
    { new: true }
  );

  res.status(200).json({ status: "success", data: rider });
});

// 🔹 Find nearby riders (dispatch service)
export const getRidersWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(",");

  const radius = unit === "mi" ? distance / 3963.2 : distance / 6378.1;

  const riders = await Rider.find({
    location: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
    availabilityStatus: "available",
  });

  res.status(200).json({
    status: "success",
    results: riders.length,
    data: riders,
  });
});

// ====================================================
// 🟥 ADMIN ACTIONS
// ====================================================

// 🔹 Delivery Bag
export const submitDeliveryBag = catchAsync(async (req, res, next) => {
  await Rider.findByIdAndUpdate(
    req.params.id,
    {
      deliveryBag: {
        issued: req.body.issued,
        depositAmount: req.body.depositAmount,
        issueDate: req.body.issueDate,
        returned: req.body.returned,
      },
    },
    { runValidators: true }
  );

  res.status(200).json({ status: "success", message: "Delivery Bag updated" });
});

// 🔹 Background Check Consent
export const submitBackgroundCheckAdmin = catchAsync(async (req, res, next) => {
  await Rider.findByIdAndUpdate(
    req.params.id,
    {
      backgroundCheck: {
        submitted: req.body.submitted,
        status: req.body.status,
        provider: req.body.provider || "manual",
        verifiedAt: req.body.verifiedAt,
      },
    },
    { runValidators: true }
  );

  res.status(200).json({
    status: "success",
    message: "Background check updated successfully",
  });
});

// 🔹 Approve rider
export const adminApproveRider = catchAsync(async (req, res, next) => {
  const rider = await Rider.findByIdAndUpdate(
    req.params.id,
    {
      employmentStatus: "approved",
      isVerified: true,
    },
    { new: true }
  );

  res.status(200).json({ status: "success", data: rider });
});

// 🔹 Reject rider
export const adminRejectRider = catchAsync(async (req, res, next) => {
  await Rider.findByIdAndUpdate(
    req.params.id,
    {
      employmentStatus: "rejected",
      reasons: {
        rejectionReason: req.body.reason,
        suspensionReason: "",
        blockReason: "",
      },
    },
    { new: true }
  );

  res.status(200).json({ status: "success", message: "Rider rejected" });
});

// 🔹 Suspend rider
export const adminSuspendRider = catchAsync(async (req, res, next) => {
  await Rider.findByIdAndUpdate(req.params.id, {
    employmentStatus: "suspended",
    reasons: {
      suspensionReason: req.body.reason,
      rejectionReason: "",
      blockReason: "",
    },
  });

  res.status(200).json({ status: "success", message: "Rider Suspended" });
});

// 🔹 Suspend rider
export const adminBlockRider = catchAsync(async (req, res, next) => {
  await Rider.findByIdAndUpdate(req.params.id, {
    employmentStatus: "blocked",
    reasons: {
      blockReason: req.body.reason,
      rejectionReason: "",
      suspensionReason: "",
    },
  });

  res.status(200).json({ status: "success", message: "Rider Blocked" });
});

// 🔹 Dashboard Stats
export const getRiderDashboardStats = catchAsync(async (req, res) => {
  const totalRiders = await Rider.countDocuments();
  const approvedRiders = await Rider.countDocuments({
    employmentStatus: "approved",
  });
  const pendingRiders = await Rider.countDocuments({
    employmentStatus: "pending",
  });
  const suspendedRiders = await Rider.countDocuments({
    employmentStatus: "suspended",
  });

  res.status(200).json({
    status: "success",
    data: {
      totalRiders,
      approvedRiders,
      pendingRiders,
      suspendedRiders,
    },
  });
});

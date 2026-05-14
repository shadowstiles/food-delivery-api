import mongoose from "mongoose";

import * as factory from "./handlerFactory.js";
import Admin from "../models/adminModel.js";
import Auth from "../models/authModel.js";
import PlatformSettings from "../models/platformSettingsModel.js";
import System from "../models/systemModel.js";
import Wallet from "../models/walletModel.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

export const getAllAdmin = factory.getAll({ Model: Admin });
export const createAdmin = factory.createOne(Admin);
export const updateAdmin = factory.updateOne(Admin, "admin");
export const deleteAdmin = factory.deleteOne(Admin, "admin");

export const getAdmin = catchAsync(async (req, res, next) => {
  const admin = await Admin.findOne({
    $or: [{ _id: req.params.id }, { authId: req.params.id }],
  });

  if (!admin) {
    return next(new AppError(`No Admin found with that ID`, 404));
  }

  res.status(200).json({
    status: "success",
    data: { data: admin },
  });
});

export const bootstrapPlatform = catchAsync(async (req, res, next) => {
  //
  // DISABLE ROUTE GLOBALLY
  //
  if (process.env.ALLOW_BOOTSTRAP !== "true") {
    return next(new AppError(`Bootstrap route disabled`, 403));
  }

  //
  // SECRET PROTECTION
  //
  if (req.headers["x-bootstrap-secret"] !== process.env.BOOTSTRAP_SECRET) {
    return next(new AppError(`Unauthourized`, 401));
  }

  //
  // START TRANSACTION
  //
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    //
    // CHECK SYSTEM STATE
    //
    let system = await System.findOne().session(session);

    if (system?.isBootstrapped) {
      await session.abortTransaction();

      return next(new AppError(`Platform already bootstrapped`, 403));
    }

    //
    // CREATE SYSTEM IF NOT EXISTS
    //
    if (!system) {
      system = await System.create(
        [
          {
            isBootstrapped: false,
          },
        ],
        { session }
      );

      system = system[0];
    }

    //
    // CREATE AUTH
    //
    const auth = await Auth.create(
      [
        {
          email: req.body.email,
          phoneNumber: req.body.phoneNumber,
          role: "admin",
          mustUpdatePasscode: true,
        },
      ],
      { session }
    );

    //
    // CREATE SUPERADMIN
    //
    const admin = await Admin.create(
      [
        {
          authId: auth[0]._id,
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          roleLevel: "superadmin",
          permissions: [
            "viewDashboard",
            "viewChat",
            "viewCustomers",
            "createCustomers",
            "editCustomers",
            "deleteCustomers",
            "customerDetails",
            "viewAdmins",
            "createAdmins",
            "editAdmins",
            "deleteAdmins",
            "adminDetails",
            "viewVendors",
            "createVendors",
            "editVendors",
            "deleteVendors",
            "vendorDetails",
            "viewRiders",
            "createRider",
            "editRider",
            "deleteRider",
            "riderDetails",
            "viewRestaurants",
            "createRestaurants",
            "editRestaurants",
            "deleteRestaurants",
            "restaurantDetails",
            "viewProducts",
            "createProducts",
            "editProducts",
            "deleteProducts",
            "viewCategories",
            "createCategory",
            "editCategory",
            "deleteCategory",
            "viewBanners",
            "createBanner",
            "editBanner",
            "deleteBanner",
            "viewBrands",
            "createBrand",
            "editBrand",
            "deleteBrand",
            "viewOrders",
            "manageOrders",
            "refundOrders",
            "viewWallet",
            "managePayouts",
            "manageSettlements",
            "manageRefund",
            "viewTransaction",
            "manageTransaction",
            "manageWalletTransaction",
            "uploadMedia",
            "manageProfile",
            "manageSettings",
            "logout",
          ],
          isActive: true,
        },
      ],
      { session }
    );

    //
    // CREATE PLATFORM WALLET
    //
    const wallet = await Wallet.create(
      [
        {
          owner: admin[0]._id,
          ownerType: "Admin",
        },
      ],
      { session }
    );

    //
    // CREATE PLATFORM SETTINGS
    //
    await PlatformSettings.create(
      [
        {
          platformAdmin: admin[0]._id,
          updatedBy: admin[0]._id,
          platformWallet: wallet[0]._id,
        },
      ],
      { session }
    );

    //
    // MARK SYSTEM AS BOOTSTRAPPED
    //
    system.isBootstrapped = true;
    system.bootstrappedAt = new Date();

    await system.save({ session });

    //
    // COMMIT
    //
    await session.commitTransaction();

    return res.status(201).json({
      status: "success",
      message: "Platform bootstrapped successfully",
    });
  } catch (err) {
    await session.abortTransaction();

    return next(new AppError(err.message, 500));
  } finally {
    session.endSession();
  }
});

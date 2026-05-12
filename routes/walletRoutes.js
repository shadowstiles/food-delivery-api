import express from "express";

import * as authController from "../controllers/authController.js";
import * as walletController from "../controllers/walletController.js";

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);
router.use(authController.restrictTo("vendor", "rider", "admin"));

// get or create wallet (ownerType = User|Rider|Vendor)
router.route("/").post(walletController.getWallet);

// list wallet transactions (with pagination)
router
  .route("/:walletId/transactions")
  .get(walletController.getAllTransactions);

// Admin-only ledger operations. Customer wallet payments are intentionally
// disabled for the MVP; vendor/rider settlement still uses the internal ledger.
router
  .route("/transfer")
  .post(authController.restrictTo("admin"), walletController.transferBtwWallets);
router
  .route("/credit")
  .post(authController.restrictTo("admin"), walletController.creditUserWallet);

// { action: 'freeze' | 'unfreeze' } (admin)
router
  .route("/:walletId/freeze")
  .patch(authController.restrictTo("admin"), walletController.freezAccount);
router
  .route("/:walletId/activate")
  .patch(authController.restrictTo("admin"), walletController.activateAccount);

// Quick balance check
router.route("/:walletId/balance").get(walletController.checkBalance);

// Quick Verification of Wallet Number
router
  .route("/:walletNumber/confirm-wallet")
  .get(walletController.getWalletName);

export default router;

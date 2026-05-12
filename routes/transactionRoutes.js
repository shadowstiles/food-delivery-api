import express from "express";

import * as authController from "../controllers/authController.js";
import * as transactionController from "../controllers/transactionController.js";

const router = express.Router();

// Protect all routes after this middleware and make sure only admin has access
router.use(authController.protect, authController.restrictTo("admin"));

// Get all Transactions
router.route("/").get(transactionController.getAllTransaction);

// Get filtered Transaction
router.route("/filter").post(transactionController.getFilteredTransaction);

export default router;

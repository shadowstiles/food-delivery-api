import express from "express";

import flutterwaveWebhook from "../controllers/webhook/flutterwaveWebhookController.js";
import monnifyWebhook from "../controllers/webhook/monnifyWebhookController.js";
import paystackWebhook from "../controllers/webhook/paystackWebhookController.js";
import * as webhookController from "../controllers/webhookController.js";

const router = express.Router();

router.post("/paystack", paystackWebhook);
router.post("/monnify", monnifyWebhook);
router.post("/flutterwave", flutterwaveWebhook);
router.post("/refund/:gateway", webhookController.gatewayRefundWebhook);
router.post("/payout", webhookController.handlePayoutWebhook);

export default router;

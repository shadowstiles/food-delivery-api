// routes/test.js
import express from "express";

import { flw } from "../utils/flutterwave.js";

const router = express.Router();

router.get("/flw-test", async (req, res) => {
  try {
    const banks = await flw.Bank.country({ country: "NG" });
    res.json({ ok: true, banks: banks.data.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;

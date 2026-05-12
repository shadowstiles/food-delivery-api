import express from "express";

import * as authController from "../controllers/authController.js";
import {
  createSupportTicket,
  deleteSupportTicket,
  getAllSupportTickets,
  getContactSettings,
  getSingleSupportTicket,
  resolveSupportTicket,
  upsertContactSettings,
} from "../controllers/supportController.js";

const router = express.Router();

router.use(authController.protect);

// ==========================================
// USER ROUTES
// ==========================================

// GET CONTACT SETTINGS
router.get("/contact-settings", getContactSettings);

// CREATE SUPPORT TICKET
router.post("/support-ticket", createSupportTicket);

// ==========================================
// ADMIN ROUTES
// ==========================================

// Protect all routes after this middleware
router.use(authController.restrictTo("admin"));

// CREATE OR UPDATE CONTACT SETTINGS
router.put("/admin/contact-settings", upsertContactSettings);

// GET ALL SUPPORT TICKETS
router.get("/admin/support-tickets", getAllSupportTickets);

// GET SINGLE SUPPORT TICKET
router.get("/admin/support-ticket/:id", getSingleSupportTicket);

// RESOLVE SUPPORT TICKET
router.put("/admin/support-ticket/:id/resolve", resolveSupportTicket);

// DELETE SUPPORT TICKET
router.delete("/admin/support-ticket/:id", deleteSupportTicket);

export default router;

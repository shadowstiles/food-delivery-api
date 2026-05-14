import express from "express";
import rateLimit from "express-rate-limit";
import multer from "multer";

import * as authController from "../controllers/authController.js";
import * as userController from "../controllers/userController.js";

const upload = multer();
export const router = express.Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many authentication attempts. Please try again later.",
});

// ====== Senstive Routes ======
router.route("/signup").post(authLimiter, authController.signup);
router.route("/signup-rider").post(authLimiter, authController.signupRider);
router.route("/login").post(authLimiter, authController.login);
router.route("/refresh").post(authController.refresh);

router
  .route("/forgotPasscode")
  .post(authLimiter, authController.forgotPasscode);
router
  .route("/resetPasscode/:otp")
  .patch(authLimiter, authController.resetPasscode);

router
  .route("/generateEmailOTP")
  .post(authController.generateEmailVerificationOTP);
router
  .route("/verifyEmailVerificationOTP/:otp")
  .patch(authController.verifyEmailVericationOTP);

router.route("/verify-user-role").post(userController.verifyUser);
router.route("/update-passcode").patch(userController.updatePasscode);

// Protect all routes after this middleware
router.use(authController.protect);

router.route("/updatePasscode").patch(authController.updatePasscode);

router.route("/me").get(userController.getMe, userController.getUser);
router.route("/customer").get(userController.getMe, userController.getCustomer);
router
  .route("/updateMe")
  .patch(upload.single("profileImage"), userController.updateMe);
router.route("/deleteMe").delete(userController.deleteMe);

// Can only run with administartion priviledge
router.use(authController.restrictTo("admin"));

router.route("/").get(userController.getAllUsers);
router.route("/create-user").post(authController.createUserByAdmin);
router
  .route("/:id")
  .get(userController.getUser)
  .patch(userController.updateUser);

router.route("/delete").delete(userController.deleteUser);
router
  .route("/create-admin")
  .post(
    authController.restrictAdminToLevels("superadmin"),
    authController.createAdmin
  );
router.route("/create-vendor").post(authController.createVendor);
router
  .route("/update-admin/:id")
  .patch(
    authController.restrictAdminToLevels("superadmin"),
    authController.updateAdminOnlySuper
  );

export default router;

import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import hpp from "hpp";
import morgan from "morgan";

import globalErrorHandler from "./middlewares/errorMiddleware.js";
import { mongoSanitizeExpress5 } from "./middlewares/mongoSanitizeMiddleware.js";
import xssMiddleware from "./middlewares/xssMiddleware.js";
// import awsS3Router from "./routes/awsS3Routes.js";
import adminRouter from "./routes/adminRoutes.js";
import bannerRouter from "./routes/bannerRoutes.js";
import brandRouter from "./routes/brandRoutes.js";
import cartItemRoutes from "./routes/cart/cartItemRoutes.js";
import cartRoutes from "./routes/cart/cartRoutes.js";
import restaurantCartRoutes from "./routes/cart/restaurantCartRoutes.js";
import categoryRouter from "./routes/categoryRoutes.js";
import cloudinaryRouter from "./routes/cloudinaryRoutes.js";
import dashboardRouter from "./routes/dashboardRoutes.js";
import deliveryRouter from "./routes/deliveryRoutes.js";
import fileRouter from "./routes/fileRoutes.js";
import locationRouter from "./routes/locationRoutes.js";
import orderRoutes from "./routes/order/orderRoutes.js";
import paymentOrderRoutes from "./routes/order/paymentRoutes.js";
import riderOrderRoutes from "./routes/order/riderOrderRoutes.js";
import storeOrderRoutes from "./routes/order/storeOrderRoutes.js";
import paymentRouter from "./routes/paymentRoutes.js";
import payoutRouter from "./routes/payoutRoutes.js";
import platformSettingsRouter from "./routes/platformSettingRoutes.js";
import productRouter from "./routes/productRoutes.js";
import reportRouter from "./routes/reportRoutes.js";
import restaurantRouter from "./routes/restaurantRoutes.js";
import reviewRouter from "./routes/reviewRoutes.js";
import riderRouter from "./routes/riderRoutes.js";
import savedItemRouter from "./routes/savedItemRoutes.js";
import settlementRouter from "./routes/settlementRoutes.js";
import supportRouter from "./routes/supportRoutes.js";
import transactionRouter from "./routes/transactionRoutes.js";
import userRouter from "./routes/userRoutes.js";
import vendorRouter from "./routes/vendorRoutes.js";
import walletRouter from "./routes/walletRoutes.js";
import webhookRouter from "./routes/webhookRoutes.js";
import AppError from "./utils/appError.js";

const app = express();

app.set("trust proxy", 1);

// Set security HTTPS Headers
app.use(helmet());

// Set a time stamp during development
if (process.env.NODE_ENV === "development") app.use(morgan("dev"));

// Set the rate limit for a particular IP address
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many request from this IP, please try again later",
});
app.use("/api", limiter);

app.use(
  cors({
    origin(origin, callback) {
      const allowedOrigins = (process.env.CORS_ORIGINS || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      if (
        process.env.NODE_ENV !== "production" &&
        allowedOrigins.length === 0
      ) {
        return callback(null, true);
      }

      return callback(new AppError("Not allowed by CORS", 403));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
  })
);

// Webhooks need the untouched request body for signature verification.
app.use(
  "/api/v1/webhooks",
  express.raw({
    type: "application/json",
    limit: "256kb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
  webhookRouter
);

// Body parser, redaing data from the body
app.use(
  express.json({
    limit: "64kb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Data sanitization against NoSQL query injection
app.use(mongoSanitizeExpress5());

// Data sanitization against XSS (Cross-site scripting attack)
app.use(xssMiddleware);

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: ["ratingsQuantity", "ratingsAverage", "price"],
  })
);

// App route endpoints
app.use("/api/v1/users", userRouter);
app.use("/api/v1/riders", riderRouter);
app.use("/api/v1/admins", adminRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/restaurants", restaurantRouter);
app.use("/api/v1/reviews", reviewRouter);
app.use("/api/v1/dashboards", dashboardRouter);
app.use("/api/v1/deliveries", deliveryRouter);
app.use("/api/v1/vendors", vendorRouter);
app.use("/api/v1/settings", platformSettingsRouter);
app.use("/api/v1/banners", bannerRouter);
app.use("/api/v1/brands", brandRouter);
app.use("/api/v1/supports", supportRouter);
app.use("/api/v1/files-storage", fileRouter);
app.use("/api/v1/savedItems", savedItemRouter);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/cart/items", cartItemRoutes);
app.use("/api/v1/cart/restaurants", restaurantCartRoutes);
app.use("/api/v1/orders/store", storeOrderRoutes);
app.use("/api/v1/orders/rider", riderOrderRoutes);
app.use("/api/v1/orders/payment", paymentOrderRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/locations", locationRouter);
app.use("/api/v1/categories", categoryRouter);
app.use("/api/v1/transactions", transactionRouter);
app.use("/api/v1/wallets", walletRouter);
app.use("/api/v1/payments", paymentRouter);
app.use("/api/v1/reports", reportRouter);
app.use("/api/v1/settlements", settlementRouter);
app.use("/api/v1/payouts", payoutRouter);
app.use("/api/v1/files", cloudinaryRouter);

app.all(/(.*)/, (req, res, next) => {
  next(new AppError(`can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

export default app;

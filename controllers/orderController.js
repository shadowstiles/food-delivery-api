/* eslint-disable no-restricted-syntax */
import axios from "axios";
import mongoose from "mongoose";

import Cart from "../models/cartModel.js";
import Delivery from "../models/deliveryModel.js";
import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";
import Rider from "../models/riderModel.js";
import Vendor from "../models/vendorModel.js";
import buildRestaurantSettlement from "../services/orderPayoutService.js";
import {
  createVendorSettlementsFromOrder,
  createRiderSettlementsFromOrder,
} from "../services/settlementService.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import sendEmail from "../utils/email/service.js";
import {
  orderCancelledTemplate,
  orderPlacedTemplate,
} from "../utils/email/templates/user.js";

export const calculateDistance = async (fromLat, fromLng, toLat, toLng) => {
  const url = `http://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=false`;

  const res = await axios.get(url);

  const { distance } = res.data.routes[0]; // meters

  return distance;
};

const calculateDeliveryFee = (distance) => {
  const baseFee = 300; // ₦300
  const perKm = 150; // ₦150 per km

  const distanceKm = distance / 1000;

  return Math.round(baseFee + distanceKm * perKm);
};

const buildOrderItems = async (cartItems) => {
  let subtotal = 0;
  const items = [];

  const productIds = cartItems.map((i) => i.productId);

  const products = await Product.find({ _id: { $in: productIds } })
    .setOptions({ skipProductHooks: true })
    .lean();

  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  for (const item of cartItems) {
    const product = productMap.get(item.productId.toString());

    if (!product) {
      throw new AppError("Product no longer available", 400);
    }

    // BASE PRICE (handle variant + discount)
    let basePrice;

    if (item.variantId) {
      const variant = product.productVariations?.find(
        (v) => v._id.toString() === item.variantId.toString()
      );

      if (!variant) {
        throw new AppError("Selected variant no longer available", 400);
      }

      basePrice = variant.discountPrice || product.price;
    } else {
      basePrice = product.priceDiscount || product.price;
    }

    // VALIDATE ADDONS FROM PRODUCT MODEL
    let addonsTotal = 0;
    const validatedAddons = [];

    for (const addon of item.addons || []) {
      let foundOption = null;

      // eslint-disable-next-line no-restricted-syntax
      for (const attr of product.productAttributes || []) {
        const option = attr.options.find(
          (opt) => opt._id.toString() === addon.addonId.toString()
        );

        if (option) {
          foundOption = option;
          break;
        }
      }

      if (!foundOption) {
        throw new AppError("An addon is no longer available", 400);
      }

      addonsTotal += foundOption.price;

      validatedAddons.push({
        addonId: foundOption._id,
        name: foundOption.name,
        price: foundOption.price,
      });
    }

    const finalUnitPrice = basePrice + addonsTotal;

    subtotal += finalUnitPrice * item.quantity;

    items.push({
      productId: product._id,
      productName: product.name,
      productImage: product.imageCover,
      quantity: item.quantity,
      unitPrice: finalUnitPrice,
      addons: validatedAddons,
    });
  }

  return { items, subtotal };
};

async function getVendorStoreIds(authId) {
  const vendor = await Vendor.findOne({ authId }).select("restaurants");
  return vendor?.restaurants || [];
}

async function assertVendorOwnsOrderStore(req, order, next) {
  if (req.user.role === "admin") return true;

  const storeIds = await getVendorStoreIds(req.user.id);
  const ownsStore = storeIds.some(
    (storeId) => storeId.toString() === order.storeId?.toString()
  );

  if (!ownsStore) {
    return next(new AppError("You cannot manage this store order", 403));
  }

  return true;
}

function canAccessOrder(req, order) {
  if (req.user.role === "admin") return true;

  const ownerId = order.authId.id || order.authId;
  return ownerId?.toString() === req.user.id;
}

function getRequestedOrderId(req) {
  return req.params.id || req.params.orderId;
}

function applyOrderStatus(order, status, reason) {
  order.status = status;

  if (status === "accepted") order.acceptedAt = new Date();
  if (status === "preparing") order.preparingAt = new Date();
  if (status === "picked") order.pickedAt = new Date();
  if (status === "delivered") order.deliveredAt = new Date();
  if (status === "cancelled") {
    order.cancelledAt = new Date();
    order.cancelReason = reason;
  }
}

// Create Order
export const createOrder = catchAsync(async (req, res, next) => {
  const { paymentMethod, deliveryAddress } = req.body;

  if (
    !["card", "cash", "monnify", "flutterwave", "monnify"].includes(
      paymentMethod
    )
  ) {
    return next(new AppError("Unsupported payment method", 400));
  }

  const cart = await Cart.findOne({ authId: req.user.id });

  if (!cart || cart.restaurantCarts.length === 0) {
    return next(new AppError("Cart is empty", 400));
  }

  if (!cart.activeRestaurantId) {
    return next(new AppError("No active restaurant selected", 400));
  }

  const restaurantCart = cart.restaurantCarts.find(
    (rc) => rc.restaurantId.toString() === cart.activeRestaurantId.toString()
  );

  if (!restaurantCart) {
    return next(new AppError("Restaurant cart not found", 404));
  }

  // Calculate totals
  const { items, subtotal } = await buildOrderItems(restaurantCart.items);

  const distance = await calculateDistance(
    restaurantCart.restaurantAddress.latitude,
    restaurantCart.restaurantAddress.longitude,
    deliveryAddress.latitude,
    deliveryAddress.longitude
  );

  const deliveryFee = calculateDeliveryFee(distance);

  const serviceFee = 0; // For future use

  const discountAmount = cart.appliedCoupon?.discountAmount || 0;

  const total = subtotal + deliveryFee + serviceFee - discountAmount;

  const order = await Order.create({
    authId: req.user.id,
    userId: deliveryAddress.userId,

    storeId: restaurantCart.restaurantId,
    storeName: restaurantCart.restaurantName,
    storeEmail: restaurantCart.restaurantEmail,
    storeImage: restaurantCart.restaurantImage,
    storeCommission: restaurantCart.restaurantCommission,

    items,
    subtotal,
    deliveryFee,
    serviceFee,
    total,

    deliveryAddress,
    paymentMethod,

    promoCode: cart.appliedCoupon?.code,
    discountAmount,
  });

  const data = await buildRestaurantSettlement(
    order,
    restaurantCart.restaurantAddress
  );

  order.deliveryFinance = data.deliveryFinance;
  order.restaurantFinance = data.restaurantFinance;

  await order.save({ validateBeforeSave: false });

  // 🧹 Remove that restaurant cart
  cart.restaurantCarts = cart.restaurantCarts.filter(
    (rc) =>
      rc.restaurantId.toString() !== restaurantCart.restaurantId.toString()
  );

  await cart.save();

  res.status(201).json({
    status: "success",
    data: { order },
  });

  // 📨 Send confirmation email (non-blocking)
  try {
    const { html, text, subject } = orderPlacedTemplate({
      orderId: order.orderNumber,
      items: order.items,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      total: order.total,
      eta: "pending",
      trackUrl: null,
    });

    await sendEmail({ to: req.user.email, subject, html, text });
  } catch (error) {
    // console.log(error);
  }
});

// Get Users Orders (All)
export const getMyOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.find({ authId: req.user.id }).sort("-createdAt");

  res.status(200).json({
    status: "success",
    results: orders.length,
    data: { orders },
  });
});

export const getUserOrders = catchAsync(async (req, res, next) => {
  if (req.user.role !== "admin" && req.params.userId !== req.user.id) {
    return next(new AppError("Not authorized", 403));
  }

  const orders = await Order.find({
    $or: [{ authId: req.params.userId }, { userId: req.params.userId }],
  }).sort("-createdAt");

  res.status(200).json({
    status: "success",
    results: orders.length,
    data: { orders },
  });
});

// Get Single Order
export const getOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findById(getRequestedOrderId(req));

  if (!order) return next(new AppError("Order not found", 404));
  if (!canAccessOrder(req, order)) {
    return next(new AppError("Not authorized", 403));
  }

  res.status(200).json({
    status: "success",
    data: { order },
  });
});

// Cancel Order (User)
export const cancelOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findById(getRequestedOrderId(req));

  if (!order) return next(new AppError("Order not found", 404));
  if (!canAccessOrder(req, order)) {
    return next(new AppError("Not authorized", 403));
  }

  if (order.status !== "pending") {
    return next(new AppError("Order cannot be cancelled at this stage", 400));
  }

  applyOrderStatus(order, "cancelled", req.body.reason);

  await order.save();

  res.status(200).json({
    status: "success",
    data: { order },
  });

  // 3) Send it to the user's email
  try {
    const { html, text, subject } = orderCancelledTemplate({
      orderId: order.orderNumber,
      reason: order.cancelReason,
      refundAmount: null,
    });

    await sendEmail({ to: req.user.email, subject, html, text });
  } catch (error) {
    // For Developer Use
    //  console.log(error)
  }
});

// Accept Order (Restaurant)
export const acceptOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findById(getRequestedOrderId(req));

  if (!order) return next(new AppError("Order not found", 404));

  if (order.status !== "pending") {
    return next(new AppError("Order already processed", 400));
  }

  const authorized = await assertVendorOwnsOrderStore(req, order, next);
  if (!authorized) return;

  applyOrderStatus(order, "accepted");

  await order.save();

  res.status(200).json({
    status: "success",
    data: { order },
  });
});

// Preparing Order
export const markPreparing = catchAsync(async (req, res, next) => {
  const order = await Order.findById(getRequestedOrderId(req));

  if (!order) return next(new AppError("Order not found", 404));

  if (order.status !== "accepted") {
    return next(new AppError("Order must be accepted first", 400));
  }

  const authorized = await assertVendorOwnsOrderStore(req, order, next);
  if (!authorized) return;

  applyOrderStatus(order, "preparing");

  await order.save();

  res.status(200).json({
    status: "success",
    data: { order },
  });
});

// Picked Up (Rider)
export const markPicked = catchAsync(async (req, res, next) => {
  const order = await Order.findById(getRequestedOrderId(req));

  if (!order) return next(new AppError("Order not found", 404));

  if (order.status !== "preparing") {
    return next(new AppError("Order not ready", 400));
  }

  const rider = await Rider.findOne({ authId: req.user.id }).select("_id");
  if (!rider) return next(new AppError("Rider profile not found", 404));

  applyOrderStatus(order, "picked");
  order.riderId = rider._id;

  await order.save();

  res.status(200).json({
    status: "success",
    data: { order },
  });
});

// Delivered
export const markDelivered = catchAsync(async (req, res, next) => {
  const order = await Order.findById(getRequestedOrderId(req));

  if (!order) return next(new AppError("Order not found", 404));

  if (order.status !== "picked") {
    return next(new AppError("Order not picked yet", 400));
  }

  const rider = await Rider.findOne({ authId: req.user.id }).select("_id");
  if (!rider) return next(new AppError("Rider profile not found", 404));
  if (order.riderId?.toString() !== rider._id.toString()) {
    return next(new AppError("You cannot deliver another rider's order", 403));
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      applyOrderStatus(order, "delivered");
      if (order.paymentMethod === "cash") order.paymentStatus = "paid";

      await order.save({ session });

      if (order.paymentStatus === "paid") {
        await createVendorSettlementsFromOrder(order, session);
      }

      await createRiderSettlementsFromOrder(order, session);
    });
  } finally {
    session.endSession();
  }

  res.status(200).json({
    status: "success",
    data: { order },
  });
});

// PAYMENT SUCCESS (Webhook / Callback)
export const markPaymentSuccess = catchAsync(async (req, res, next) => {
  const { reference } = req.body;

  const order = await Order.findOne({
    paymentReference: reference,
  });

  if (!order) return next(new AppError("Order not found", 404));

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      order.paymentStatus = "paid";

      await order.save({ session });

      await createVendorSettlementsFromOrder(order, session);
      if (order.status === "delivered") {
        await createRiderSettlementsFromOrder(order, session);
      }
    });
  } finally {
    session.endSession();
  }

  res.status(200).json({
    status: "success",
  });
});

// Payment Failed
export const markPaymentFailed = catchAsync(async (req, res, next) => {
  const { reference } = req.body;

  const order = await Order.findOne({
    paymentReference: reference,
  });

  if (!order) return next(new AppError("Order not found", 404));

  order.paymentStatus = "failed";

  await order.save();

  res.status(200).json({
    status: "success",
  });
});

// GET STORE ORDERS (For Vendor Dashboard)
export const getStoreOrders = catchAsync(async (req, res, next) => {
  const query = {};

  if (req.user.role !== "admin") {
    const storeIds = await getVendorStoreIds(req.user.id);
    query.storeId = { $in: storeIds };
  }

  const orders = await Order.find(query).sort("-createdAt");

  res.status(200).json({
    status: "success",
    results: orders.length,
    data: { orders },
  });
});

export const getRestaurantOrders = catchAsync(async (req, res, next) => {
  const query = { storeId: req.params.restaurantId };

  if (req.user.role !== "admin") {
    const storeIds = await getVendorStoreIds(req.user.id);
    const ownsStore = storeIds.some(
      (storeId) => storeId.toString() === req.params.restaurantId
    );

    if (!ownsStore) {
      return next(
        new AppError("You cannot view this restaurant's orders", 403)
      );
    }
  }

  const orders = await Order.find(query).sort("-createdAt");

  res.status(200).json({
    status: "success",
    results: orders.length,
    data: { orders },
  });
});

// Get Riders Orders
export const getRiderOrders = catchAsync(async (req, res, next) => {
  const rider = await Rider.findOne({ authId: req.user.id }).select("_id");
  if (!rider) return next(new AppError("Rider profile not found", 404));

  const orders = await Order.find({
    riderId: rider._id,
  }).sort("-createdAt");

  res.status(200).json({
    status: "success",
    data: { orders },
  });
});

// Track Order
export const trackOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id).populate(
    "riderId",
    "name phone"
  );

  if (!order) return next(new AppError("Order not found", 404));

  // Optional: ensure user owns the order
  if (!canAccessOrder(req, order)) {
    return next(new AppError("Not authorized", 403));
  }

  const timeline = [
    {
      status: "pending",
      completed: true,
      time: order.createdAt,
    },
    {
      status: "accepted",
      completed: !!order.acceptedAt,
      time: order.acceptedAt,
    },
    {
      status: "preparing",
      completed: !!order.preparingAt,
      time: order.preparingAt,
    },
    {
      status: "picked",
      completed: !!order.pickedAt,
      time: order.pickedAt,
    },
    {
      status: "delivered",
      completed: !!order.deliveredAt,
      time: order.deliveredAt,
    },
  ];

  res.status(200).json({
    status: "success",
    data: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,

      store: {
        id: order.storeId,
        name: order.storeName,
        image: order.storeImage,
      },

      rider: order.riderId
        ? {
            id: order.riderId._id,
            name: order.riderId.name,
            phone: order.riderId.phone,
          }
        : null,

      deliveryAddress: order.deliveryAddress,

      timeline,
    },
  });
});

export const getAllOrder = catchAsync(async (req, res, next) => {
  const orders = await Order.find().sort("-createdAt");

  res.status(200).json({
    status: "success",
    results: orders.length,
    data: { orders },
  });
});

export const cancelRestaurantOrderByUser = catchAsync(
  async (req, res, next) => {
    const order = await Order.findById(req.params.orderId);

    if (!order) return next(new AppError("Order not found", 404));
    if (!canAccessOrder(req, order)) {
      return next(new AppError("Not authorized", 403));
    }

    if (order.storeId?.toString() !== req.params.restaurantId) {
      return next(
        new AppError("Restaurant does not belong to this order", 400)
      );
    }

    if (!["pending", "accepted"].includes(order.status)) {
      return next(new AppError("Order cannot be cancelled at this stage", 400));
    }

    applyOrderStatus(order, "cancelled", req.body.reason);
    await order.save();

    res.status(200).json({
      status: "success",
      data: { order },
    });
  }
);

export const updateRestaurantOrderStatus = catchAsync(
  async (req, res, next) => {
    const { status } = req.body;
    const allowedStatuses = ["accepted", "preparing", "cancelled"];

    if (!allowedStatuses.includes(status)) {
      return next(new AppError("Invalid restaurant order status", 400));
    }

    const order = await Order.findById(req.params.orderId);

    if (!order) return next(new AppError("Order not found", 404));
    if (order.storeId?.toString() !== req.params.restaurantId) {
      return next(
        new AppError("Restaurant does not belong to this order", 400)
      );
    }

    const authorized = await assertVendorOwnsOrderStore(req, order, next);
    if (!authorized) return;

    applyOrderStatus(order, status, req.body.reason);
    await order.save();

    res.status(200).json({
      status: "success",
      data: { order },
    });
  }
);

export const updateRidersChoice = catchAsync(async (req, res, next) => {
  const { choice } = req.body;

  if (!["accept", "reject"].includes(choice)) {
    return next(new AppError("Invalid rider choice", 400));
  }

  const rider = await Rider.findOne({ authId: req.user.id }).select("_id");
  if (!rider) return next(new AppError("Rider profile not found", 404));

  const order = await Order.findOne({
    $or: [
      { _id: req.params.deliveryId },
      { "deliveryFinance.delivery": req.params.deliveryId },
    ],
  });

  if (!order) return next(new AppError("Order not found", 404));

  order.ridersChoice = choice;
  if (choice === "accept") order.riderId = rider._id;

  await order.save();

  if (choice === "accept") {
    await Delivery.findOneAndUpdate(
      {
        $or: [
          { _id: req.params.deliveryId },
          { order: order._id },
        ],
      },
      {
        rider: rider._id,
        status: "assigned",
        assignedAt: new Date(),
      },
      { new: true }
    );
  }

  res.status(200).json({
    status: "success",
    data: { order },
  });
});

export const updateOrderStatusByRider = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  const allowedStatuses = ["picked", "delivered", "cancelled"];

  if (!allowedStatuses.includes(status)) {
    return next(new AppError("Invalid rider order status", 400));
  }

  const rider = await Rider.findOne({ authId: req.user.id }).select("_id");
  if (!rider) return next(new AppError("Rider profile not found", 404));

  if (
    rider._id.toString() !== req.params.riderId &&
    req.user.role !== "admin"
  ) {
    return next(new AppError("You cannot update another rider's order", 403));
  }

  const order = await Order.findById(req.params.orderId);

  if (!order) return next(new AppError("Order not found", 404));
  if (order.riderId?.toString() !== req.params.riderId) {
    return next(new AppError("Order is not assigned to this rider", 403));
  }

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      applyOrderStatus(order, status, req.body.reason);
      if (status === "delivered" && order.paymentMethod === "cash") {
        order.paymentStatus = "paid";
      }

      await order.save({ session });

      if (status === "delivered") {
        if (order.paymentStatus === "paid") {
          await createVendorSettlementsFromOrder(order, session);
        }

        await createRiderSettlementsFromOrder(order, session);
      }
    });
  } finally {
    session.endSession();
  }

  res.status(200).json({
    status: "success",
    data: { order },
  });
});

export const updateOrderStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  const allowedStatuses = [
    "pending",
    "accepted",
    "preparing",
    "picked",
    "delivered",
    "cancelled",
  ];

  if (!allowedStatuses.includes(status)) {
    return next(new AppError("Invalid order status", 400));
  }

  const order = await Order.findById(getRequestedOrderId(req));

  if (!order) return next(new AppError("Order not found", 404));

  if (
    req.user.role !== "admin" &&
    status !== "picked" &&
    status !== "delivered"
  ) {
    const authorized = await assertVendorOwnsOrderStore(req, order, next);
    if (!authorized) return;
  }

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      applyOrderStatus(order, status, req.body.reason);
      if (status === "delivered" && order.paymentMethod === "cash") {
        order.paymentStatus = "paid";
      }

      await order.save({ session });

      if (status === "delivered") {
        if (order.paymentStatus === "paid") {
          await createVendorSettlementsFromOrder(order, session);
        }

        await createRiderSettlementsFromOrder(order, session);
      }
    });
  } finally {
    session.endSession();
  }

  res.status(200).json({
    status: "success",
    data: { order },
  });
});

// 1. Validate idempotency
// 2. Get cart
// 3. Get active restaurant
// 4. 🔒 Re-fetch products → buildOrderItems()
// 5. 📍 Calculate distance → delivery fee
// 6. Apply coupon
// 7. Compute total
// 8. Create order
// 9. Clear cart

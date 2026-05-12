/* eslint-disable no-continue */
import Cart from "../models/cartModel.js";
import Product from "../models/productModel.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

/**
 * Add an item to cart (Create cart if not exists, Create restaurant cart if not exists, Merge items using uniqueKey)
 */
export const addToCart = catchAsync(async (req, res, next) => {
  const { restaurant, item } = req.body;

  if (!restaurant?.restaurantId || !item?.productId) {
    return next(new AppError("Restaurant and cart item are required", 400));
  }

  if (!Number.isInteger(item.quantity) || item.quantity < 1) {
    return next(new AppError("Quantity must be at least 1", 400));
  }

  let cart = await Cart.findOne({ authId: req.user.id });

  if (!cart) {
    cart = await Cart.create({
      authId: req.user.id,
      restaurantCarts: [],
    });
  }

  const restaurantCart = cart.restaurantCarts.find(
    (rc) => rc.restaurantId.toString() === restaurant.restaurantId
  );

  if (!restaurantCart) {
    cart.restaurantCarts.push({
      ...restaurant,
      items: [item],
    });
  } else {
    const existingItem = restaurantCart.items.find(
      (i) => i.uniqueKey === item.uniqueKey
    );

    if (existingItem) {
      existingItem.quantity += item.quantity;
    } else {
      restaurantCart.items.push(item);
    }
  }

  await cart.save();

  res.status(200).json({
    status: "success",
    data: { cart },
  });
});

/**
 * Update cart item
 */
export const updateCartItem = catchAsync(async (req, res, next) => {
  const { itemId } = req.params;
  const { quantity } = req.body;

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
    return next(new AppError("Quantity must be between 1 and 50", 400));
  }

  const cart = await Cart.findOne({ authId: req.user.id });

  if (!cart) return next(new AppError("Cart not found", 404));

  let cartItem;

  cart.restaurantCarts.forEach((rc) => {
    const item = rc.items.id(itemId);
    if (item) cartItem = item;
  });

  if (!cartItem) {
    return next(new AppError("Cart item not found", 404));
  }

  cartItem.quantity = quantity;

  await cart.save();

  res.status(200).json({
    status: "success",
    data: { cart },
  });
});

/**
 * Update item Note
 */
export const updateItemNotes = catchAsync(async (req, res, next) => {
  const { itemId } = req.params;
  const { notes } = req.body;

  const cart = await Cart.findOne({ authId: req.user.id });

  if (!cart) return next(new AppError("Cart not found", 404));

  let cartItem;

  cart.restaurantCarts.forEach((rc) => {
    const item = rc.items.id(itemId);
    if (item) cartItem = item;
  });

  if (!cartItem) {
    return next(new AppError("Cart item not found", 404));
  }

  cartItem.notes = notes;

  await cart.save();

  res.status(200).json({
    status: "success",
    data: { cart },
  });
});

/**
 * Get all cart items for the logged-in user
 */
export const getMyCart = catchAsync(async (req, res, next) => {
  const cart = await Cart.findOne({ authId: req.user.id });

  if (!cart) {
    return res.status(200).json({
      status: "success",
      data: { cart: { restaurantCarts: [] } },
    });
  }

  res.status(200).json({
    status: "success",
    data: { cart },
  });
});

/**
 * Remove a single cart item
 */
export const removeCartItem = catchAsync(async (req, res, next) => {
  const { itemId } = req.params;

  const cart = await Cart.findOne({ authId: req.user.id });

  if (!cart) return next(new AppError("Cart not found", 404));

  let found = false;

  cart.restaurantCarts.forEach((rc) => {
    const item = rc.items.id(itemId);
    if (item) {
      item.deleteOne();
      found = true;
    }
  });

  if (!found) {
    return next(new AppError("Cart item not found", 404));
  }

  await cart.save();

  res.status(200).json({
    status: "success",
    data: { cart },
  });
});

/**
 * Update cart note restaurant level
 */
export const updateRestaurantNotes = catchAsync(async (req, res, next) => {
  const { restaurantId } = req.params;
  const { notes } = req.body;

  const cart = await Cart.findOne({ authId: req.user.id });

  if (!cart) return next(new AppError("Cart not found", 404));

  const restaurantCart = cart.restaurantCarts.find(
    (rc) => rc.restaurantId.toString() === restaurantId
  );

  if (!restaurantCart) {
    return next(new AppError("Restaurant cart not found", 404));
  }

  restaurantCart.notes = notes;

  await cart.save();

  res.status(200).json({
    status: "success",
    data: { cart },
  });
});

/**
 * Clear one restaurant cart
 */
export const clearRestaurantCart = catchAsync(async (req, res, next) => {
  const { restaurantId } = req.params;

  const cart = await Cart.findOne({ authId: req.user.id });

  if (!cart) return next(new AppError("Cart not found", 404));

  cart.restaurantCarts = cart.restaurantCarts.filter(
    (rc) => rc.restaurantId.toString() !== restaurantId
  );

  await cart.save();

  res.status(200).json({
    status: "success",
    data: { cart },
  });
});

/**
 * Clear all cart items for the user
 */
export const clearCart = catchAsync(async (req, res, next) => {
  await Cart.findOneAndDelete({ authId: req.user.id });

  res.status(204).json({
    status: "success",
    data: null,
  });
});

/**
 * Merge Guest Cart
 * Used after login
 */
export const mergeCart = catchAsync(async (req, res, next) => {
  const { guestCart } = req.body;

  let userCart = await Cart.findOne({ authId: req.user.id });

  if (!userCart) {
    userCart = await Cart.create({
      authId: req.user.id,
      restaurantCarts: guestCart.restaurantCarts,
    });
  } else {
    guestCart.restaurantCarts.forEach((guestRC) => {
      const existingRC = userCart.restaurantCarts.find(
        (rc) => rc.restaurantId.toString() === guestRC.restaurantId.toString()
      );

      if (!existingRC) {
        userCart.restaurantCarts.push(guestRC);
      } else {
        guestRC.items.forEach((guestItem) => {
          const existingItem = existingRC.items.find(
            (i) => i.uniqueKey === guestItem.uniqueKey
          );

          if (existingItem) {
            existingItem.quantity += guestItem.quantity;
          } else {
            existingRC.items.push(guestItem);
          }
        });
      }
    });
  }

  await userCart.save();

  res.status(200).json({
    status: "success",
    data: { cart: userCart },
  });
});

/**
 * Get Cart Totals
 */
export const getCartTotals = catchAsync(async (req, res, next) => {
  const cart = await Cart.findOne({ authId: req.user.id });

  if (!cart) return res.status(200).json({ total: 0 });

  let total = 0;

  cart.restaurantCarts.forEach((rc) => {
    rc.items.forEach((item) => {
      const addonsTotal = item.addons.reduce((sum, a) => sum + a.price, 0);

      total += (item.unitPrice + addonsTotal) * item.quantity;
    });
  });

  res.status(200).json({
    status: "success",
    data: { total },
  });
});

/**
 * Validate Car Controller
 * (Checks)
 * items exist
 * prices still valid (mocked here)
 * restaurant availability
 */
export const validateCart = catchAsync(async (req, res, next) => {
  const { restaurantId } = req.params;

  const cart = await Cart.findOne({ authId: req.user.id });
  if (!cart) return next(new AppError("Cart not found", 404));

  const issues = [];

  const rc = cart.restaurantCarts.find(
    (r) => r.restaurantId.toString() === restaurantId
  );

  if (!rc) {
    return res.status(200).json({
      status: "success",
      data: { valid: true, issues: [] },
    });
  }

  const productIds = rc.items.map((i) => i.productId);

  const products = await Product.find({ _id: { $in: productIds } })
    .setOptions({ skipProductHooks: true })
    .lean();

  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  // eslint-disable-next-line no-restricted-syntax
  for (const item of rc.items) {
    const product = productMap.get(item.productId.toString());

    if (!product) {
      issues.push({
        itemId: item._id,
        message: `${item.productName} no longer exists`,
      });
      continue;
    }

    if (!product.isAvailable) {
      issues.push({
        itemId: item._id,
        message: `${item.productName} is unavailable`,
      });
    }

    if (product.restaurant.toString() !== restaurantId) {
      issues.push({
        itemId: item._id,
        message: `${item.productName} moved restaurants`,
      });
    }

    // BASE PRICE
    let basePrice;

    if (item.variantId) {
      const variant = product.productVariations?.find(
        (v) => v._id.toString() === item.variantId.toString()
      );

      if (!variant) {
        issues.push({
          itemId: item._id,
          message: `${item.productName} variant no longer exists`,
        });
        continue;
      }

      basePrice = variant.discountPrice || variant.price;
    } else {
      basePrice = product.priceDiscount || product.price;
    }

    // ATTRIBUTES (ADDONS)
    // const addonsTotal = 0;

    // eslint-disable-next-line no-restricted-syntax
    for (const addon of item.addons) {
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
        issues.push({
          itemId: item._id,
          message: `An option in ${item.productName} no longer exists`,
        });
        continue;
      }

      if (foundOption.price !== addon.price) {
        issues.push({
          itemId: item._id,
          message: `Option price changed for ${item.productName}`,
        });
      }

      // addonsTotal += foundOption.price;
    }

    // const expectedUnitPrice = basePrice + addonsTotal;

    if (item.unitPrice !== basePrice) {
      issues.push({
        itemId: item._id,
        message: `${item.productName} price has changed`,
      });
    }

    if (item.quantity > 50) {
      issues.push({
        itemId: item._id,
        message: "Quantity exceeds limit",
      });
    }
  }

  res.status(200).json({
    status: "success",
    data: {
      valid: issues.length === 0,
      issues,
    },
  });
});

/**
 * checkout targeting
 * UI focus
 * delivery calculation
 */
export const setActiveRestaurant = catchAsync(async (req, res, next) => {
  const { restaurantId } = req.body;

  const cart = await Cart.findOne({ authId: req.user.id });

  if (!cart) return next(new AppError("Cart not found", 404));

  const exists = cart.restaurantCarts.some(
    (rc) => rc.restaurantId.toString() === restaurantId
  );

  if (!exists) {
    return next(new AppError("Restaurant not found in cart", 404));
  }

  cart.activeRestaurantId = restaurantId;

  await cart.save();

  res.status(200).json({
    status: "success",
    data: { cart },
  });
});

// couponService
export const getCoupon = (code) => {
  const coupons = {
    SAVE10: { discountType: "percent", value: 10 },
    FLAT500: { discountType: "fixed", value: 500 },
  };

  return coupons[code.toUpperCase()];
};

export const applyCoupon = catchAsync(async (req, res, next) => {
  const { code } = req.body;

  if (!code) return next(new AppError("Coupon code is required", 400));

  const cart = await Cart.findOne({ authId: req.user.id });

  if (!cart) return next(new AppError("Cart not found", 404));

  const coupon = getCoupon(code);

  if (!coupon) {
    return next(new AppError("Invalid coupon code", 400));
  }

  // calculate total
  let total = 0;

  cart.restaurantCarts.forEach((rc) => {
    rc.items.forEach((item) => {
      const addonsTotal = item.addons.reduce((sum, a) => sum + a.price, 0);

      total += (item.unitPrice + addonsTotal) * item.quantity;
    });
  });

  let discountAmount = 0;

  if (coupon.discountType === "percent") {
    discountAmount = (total * coupon.value) / 100;
  } else {
    discountAmount = coupon.value;
  }

  cart.appliedCoupon = {
    code,
    ...coupon,
    discountAmount,
  };

  await cart.save();

  res.status(200).json({
    status: "success",
    data: { cart },
  });
});

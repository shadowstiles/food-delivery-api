// utils/commission.js

import AppError from "./appError.js";

/**
 * Calculate platform commission, restaurant earnings, and rider earnings
 * @param {Object} order - order document (with itemsTotal, deliveryFee, restaurant)
 * @param {Number} commissionRate - percentage commission (e.g., 10 means 10%)
 * @returns {Object} { platformCommission, restaurantEarnings, riderEarnings }
 */
function calculateCommissionAndFees(order, commissionRate = 10) {
  if (!order || typeof order.itemsTotal !== "number") {
    const error = new AppError(
      "Invalid order object for commission calculation",
      400
    );
    throw error;
  }

  if (
    typeof commissionRate !== "number" ||
    commissionRate < 0 ||
    commissionRate > 100
  ) {
    const error = new AppError("Invalid commission rate", 400);
    throw error;
  }

  const platformCommission = Math.floor(
    (order.itemsTotal * commissionRate) / 100
  );
  const restaurantEarnings = order.itemsTotal - platformCommission;
  const riderEarnings = order.deliveryFee;

  return {
    platformCommission,
    restaurantEarnings,
    riderEarnings,
  };
}

export default calculateCommissionAndFees;

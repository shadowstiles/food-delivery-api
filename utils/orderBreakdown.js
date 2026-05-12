import AppError from "./appError.js";
import getPlatformSettings from "./platformSettings.js";
import Delivery from "../models/deliveryModel.js";
import Restaurant from "../models/restaurantModel.js";

export function calculateDeliveryFee(distanceKm, cachedSettings) {
  let fee =
    cachedSettings.baseDeliveryFee + distanceKm * cachedSettings.perKmRate;

  fee = Math.max(fee, cachedSettings.minDeliveryFee);
  fee = Math.min(fee, cachedSettings.maxDeliveryFee);

  // Based on Nigerian research on delivery fees
  // if (distanceKm <= 2) return 500;
  // if (distanceKm <= 5) return 800;
  // if (distanceKm <= 10) return 1500;

  if (distanceKm <= 100) return fee;
  throw new AppError("Delivery distance too far");
}

export default async function buildRestaurantBreakdown(order) {
  if (!order || !order.items) return [];

  const restaurantMap = {};
  const itemsByRestaurant = {};

  const restaurantBreakdown = [];
  let totalDeliveryFee = 0;
  let totalPlatformEarning = 0;
  let totalRiderPayout = 0;
  let orderSubTotal = 0;

  const cachedSettings = await getPlatformSettings();

  // eslint-disable-next-line no-restricted-syntax
  for (const item of order.items) {
    const { restaurant } = item;

    if (!itemsByRestaurant[restaurant.id]) {
      itemsByRestaurant[restaurant.id] = [];
    }

    if (!restaurantMap[restaurant.id]) {
      restaurantMap[restaurant.id] = restaurant;
    }

    itemsByRestaurant[restaurant.id].push(item);
  }

  // eslint-disable-next-line no-restricted-syntax
  for (const restaurantId of Object.keys(itemsByRestaurant)) {
    const restaurant = restaurantMap[restaurantId];

    // 🔹 Distance calculation
    // eslint-disable-next-line no-await-in-loop
    const geoResult = await Restaurant.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: order.deliveryAddress?.coordinates,
          },
          distanceField: "distance",
          distanceMultiplier: 0.001,
          spherical: true,
          query: { _id: restaurant.id },
        },
      },
      {
        $project: {
          distance: 1,
        },
      },
    ]);

    const distanceKm = geoResult[0].distance;

    // 🔹 Delivery fee
    const deliveryFee = calculateDeliveryFee(distanceKm, cachedSettings);

    // 🔹 Items total
    const restaurantItems = itemsByRestaurant[restaurantId];
    const restaurantTotal = restaurantItems.reduce(
      (sum, i) => sum + (i.priceAtPurchase || i.price) * i.quantity,
      0
    );

    // 🔹 commission and restaurant payout calculation
    const commissionRate =
      restaurant.commissionRate || cachedSettings.restaurantCommissionRate;
    const commissionAmount = (restaurantTotal * commissionRate) / 100;
    const restaurantPayout = restaurantTotal - commissionAmount;

    // Register Riders payout details
    const riderPlatformRate = cachedSettings.riderCommissionRate;
    const riderPlatformEarning = (deliveryFee * riderPlatformRate) / 100;
    const riderPayout = deliveryFee - riderPlatformEarning;

    // eslint-disable-next-line no-await-in-loop
    const delivery = await Delivery.create({
      order: order._id,
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        email: restaurant.email,
      },
      items: restaurantItems,
      pickupLocation: restaurant.address,
      dropoffLocation: order.deliveryAddress,
    });

    restaurantBreakdown.push({
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        image: restaurant.image,
        email: restaurant.email,
        ratings: restaurant.ratingsQuantity,
        address: restaurant.address,
      },
      deliveryFinance: {
        delivery: delivery._id,
        deliveryFee: deliveryFee,
        platformRate: riderPlatformRate,
        platformEarning: riderPlatformEarning,
        riderPayout: riderPayout,
      },
      items: restaurantItems,
      commissionAmount,
      commissionRate,
      restaurantPayout,
      distanceKm,
      restaurantTotal,
    });

    totalDeliveryFee += deliveryFee;
    totalRiderPayout += riderPayout;
    totalPlatformEarning += riderPlatformEarning;
    orderSubTotal += restaurantTotal;
  }

  totalDeliveryFee *= cachedSettings.surgeMultiplier;

  return {
    restaurantBreakdown,
    totalDeliveryFee,
    totalRiderPayout,
    totalPlatformEarning,
    orderSubTotal,
  };
}

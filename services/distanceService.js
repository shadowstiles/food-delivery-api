import Restaurant from "../models/restaurantModel.js";
import { calculateDeliveryFee } from "../utils/orderBreakdown.js";
import getPlatformSettings from "../utils/platformSettings.js";

/**
 * - middleware to enrich any restaurant results with `distance`.
 * - Works for arrays (find) and single documents (findById/findOne).
 * - Skips gracefully if no user is logged in (public endpoints).
 */

const getRestaurantDistance = async (restaurantId, lat, lng) =>
  await Restaurant.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: "distance",
        distanceMultiplier: 0.001,
        spherical: true,
        query: { _id: restaurantId },
      },
    },
    {
      $project: {
        distance: 1,
      },
    },
  ]);

// calculate delivery fee
const calcRestaurantDeliveryFee = async function (distance) {
  const cachedSettings = await getPlatformSettings();

  return calculateDeliveryFee(distance, cachedSettings);
};

export const addDistanceAndDeliverFeeFromUser = async (
  lng,
  lat,
  restaurant
) => {
  try {
    // Handle array results
    if (Array.isArray(restaurant) && restaurant.length > 0) {
      const enrichedRestaurant = await Promise.all(
        restaurant.map(async (i) => {
          const obj = i.toObject ? i.toObject() : i;
          const distance = await getRestaurantDistance(obj._id, lat, lng);

          const deliveryFee = await calcRestaurantDeliveryFee(
            distance[0].distance
          );

          return {
            ...obj,
            distance: distance[0].distance,
            deliveryFee: deliveryFee,
          };
        })
      );

      return enrichedRestaurant;
    }

    // Handle single document
    if (restaurant) {
      const enrichedArr = await Promise.all(
        [restaurant].map(async (i) => {
          const obj = i.toObject ? i.toObject() : i;
          const distance = await getRestaurantDistance(obj._id, lat, lng);

          const deliveryFee = await calcRestaurantDeliveryFee(
            distance[0].distance
          );

          return {
            ...obj,
            distance: distance[0].distance,
            deliveryFee: deliveryFee,
          };
        })
      );

      return enrichedArr[0];
    }
  } catch (err) {
    return err;
  }
};

export default addDistanceAndDeliverFeeFromUser;

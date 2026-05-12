import Delivery from "../models/deliveryModel.js";
import getPlatformSettings from "../utils/platformSettings.js";

function toDeliveryLocation(address = {}) {
  return {
    type: "Point",
    coordinates:
      Number.isFinite(address.longitude) && Number.isFinite(address.latitude)
        ? [address.longitude, address.latitude]
        : undefined,
    fullAddress: address.fullAddress || address.address,
    label: address.label,
    note: address.note,
  };
}

function toDeliveryItems(items = []) {
  return items.map((item) => ({
    product: item.productId,
    productName: item.productName,
    variationId: item.variantId,
    variationName: item.variantName,
    quantity: item.quantity,
    priceAtPurchase: item.unitPrice,
  }));
}

// Builds immutable finance snapshots used later by settlementService. It also
// creates the delivery record with locations transformed to deliveryModel's
// GeoJSON-like shape.
export default async function buildRestaurantSettlement(order, pickupLocation) {
  if (!order || !order.items) {
    return {
      deliveryFinance: {},
      restaurantFinance: {},
    };
  }

  const cachedSettings = await getPlatformSettings();

  const commissionRate =
    order.storeCommission || cachedSettings.restaurantCommissionRate;
  const commissionAmount = Math.round((order.subtotal * commissionRate) / 100);
  const restaurantPayout = order.subtotal - commissionAmount;

  const riderPlatformRate = cachedSettings.riderCommissionRate;
  const riderPlatformEarning = Math.round(
    (order.deliveryFee * riderPlatformRate) / 100
  );
  const riderPayout = order.deliveryFee - riderPlatformEarning;

  const delivery = await Delivery.create({
    order: order._id,
    restaurant: {
      id: order.storeId,
      name: order.storeName,
      email: order.storeEmail,
    },
    items: toDeliveryItems(order.items),
    pickupLocation: toDeliveryLocation(pickupLocation),
    dropoffLocation: toDeliveryLocation(order.deliveryAddress),
  });

  return {
    deliveryFinance: {
      delivery: delivery._id,
      deliveryFee: order.deliveryFee,
      platformRate: riderPlatformRate,
      platformEarning: riderPlatformEarning,
      riderPayout: riderPayout,
    },

    restaurantFinance: {
      commissionAmount,
      commissionRate,
      restaurantPayout,
    },
  };
}

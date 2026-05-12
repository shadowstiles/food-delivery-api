export default {
  CURRENCY: "NGN", // kobo in DB
  PLATFORM_COMMISSION_PCT: 0.1, // 10% of items subtotal (not delivery fee)
  RIDER_DELIVERY_FEE_PASSTHROUGH: true, // if true, rider gets 100% of delivery fee
  VAT_PCT: 0.0, // set to 0.075 if you’ll withhold VAT for restaurant
  // Set these from env in startup and cache them once:
  PLATFORM_MAIN_WALLET_ID: process.env.PLATFORM_MAIN_WALLET_ID,
  PLATFORM_ESCROW_WALLET_ID: process.env.PLATFORM_ESCROW_WALLET_ID,
};

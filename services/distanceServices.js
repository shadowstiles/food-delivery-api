import * as turf from "@turf/turf";
import axios from "axios";

// -----------------------------
// ⚙️ CONFIG
// -----------------------------
const { MAPBOX_TOKEN } = process.env;

const BASE_FEE = 500;
const PER_KM = 150;
const PER_MIN = 20;

// simple in-memory cache
const routeCache = new Map();
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

// -----------------------------
// ✅ VALIDATION
// -----------------------------
function isValidCoord(coord) {
  return (
    coord && typeof coord.lat === "number" && typeof coord.lng === "number"
  );
}

// -----------------------------
// 📏 STRAIGHT LINE DISTANCE
// -----------------------------
function calculateStraightDistance(pickup, dropoff) {
  const from = turf.point([pickup.lng, pickup.lat]);
  const to = turf.point([dropoff.lng, dropoff.lat]);

  const distance = turf.distance(from, to, { units: "kilometers" });

  return {
    distanceKm: Number(distance.toFixed(2)),
    durationMin: null,
    source: "straight",
  };
}

// -----------------------------
// 🗺 ROUTE DISTANCE (MAPBOX)
// -----------------------------
async function getRouteDistance(pickup, dropoff) {
  const cacheKey = `${pickup.lat},${pickup.lng}-${dropoff.lat},${dropoff.lng}`;

  // ✅ return cached result if valid
  if (routeCache.has(cacheKey)) {
    const cached = routeCache.get(cacheKey);

    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return { ...cached.data, source: "cache" };
    }
    routeCache.delete(cacheKey);
  }

  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}`;

  const res = await axios.get(url, {
    params: {
      access_token: MAPBOX_TOKEN,
      geometries: "geojson",
    },
  });

  const route = res.data.routes[0];

  const data = {
    distanceKm: route.distance / 1000,
    durationMin: route.duration / 60,
    source: "mapbox",
  };

  // ✅ store in cache
  routeCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  });

  return data;
}

// -----------------------------
// 💰 PRICING LOGIC
// -----------------------------
function calculateFee(distanceKm, durationMin) {
  let fee = BASE_FEE;

  // 📏 distance cost
  fee += distanceKm * PER_KM;

  // ⏱ traffic cost (if available)
  if (durationMin) {
    fee += durationMin * PER_MIN;
  }

  // 🧠 short trip flat rate
  if (distanceKm < 1) {
    return BASE_FEE;
  }

  // 🚀 long distance slight surge
  if (distanceKm > 10) {
    fee *= 1.1;
  }

  return Math.round(fee);
}

// -----------------------------
// 🚚 MAIN CONTROLLER
// -----------------------------
const getDeliveryFee = async (req, res) => {
  try {
    const { pickup, dropoff } = req.body;

    // ✅ validate input
    if (!isValidCoord(pickup) || !isValidCoord(dropoff)) {
      return res.status(400).json({
        success: false,
        message: "Invalid coordinates",
      });
    }

    // 📏 quick estimate
    const straight = calculateStraightDistance(pickup, dropoff);

    let routeData;

    try {
      // 🧠 hybrid logic
      if (straight.distanceKm < 2) {
        routeData = straight;
      } else {
        routeData = await getRouteDistance(pickup, dropoff);
      }
    } catch (e) {
      // ⚠️ fallback if Mapbox fails
      routeData = straight;
    }
    
    

    const { distanceKm, durationMin, source } = routeData;

    const fee = calculateFee(distanceKm, durationMin);

    return res.json({
      success: true,
      data: {
        distanceKm: Number(distanceKm.toFixed(2)),
        durationMin: durationMin ? Number(durationMin.toFixed(1)) : null,
        fee,
        source,
        breakdown: {
          baseFee: BASE_FEE,
          distanceCost: Math.round(distanceKm * PER_KM),
          timeCost: durationMin ? Math.round(durationMin * PER_MIN) : 0,
        },
      },
    });
  } catch (error) {
    process.stderr.write(`Delivery Fee Error: ${error.message}\n`);

    return res.status(500).json({
      success: false,
      message: "Failed to calculate delivery fee",
    });
  }
};

// -----------------------------
// EXPORT
// -----------------------------
export default {
  getDeliveryFee,
};

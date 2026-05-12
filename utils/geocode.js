import axios from "axios";

import Restaurant from "../models/restaurantModel.js";
import User from "../models/userModel.js";

const LOCATIONIQ_API_KEY = process.env.LOCATIONIQ_KEY;

/**
 * Geocode address using LocationIQ with caching in MongoDB
 */
async function geocodeAddress(address, type = "restaurant") {
  try {
    let existing;
    // Check cache first

    if (type === "user") {
      existing = await User.findOne({ "location.address": address });
    }

    if (type === "restaurant") {
      existing = await Restaurant.findOne({ "location.address": address });
    }

    if (existing) {
      // console.log("Cache hit:", address);
      return {
        longitude: existing.location.coordinates[0],
        latitude: existing.location.coordinates[1],
        address: existing.location.address,
      };
    }

    // If not cached, fetch from LocationIQ
    //   console.log("Cache miss, fetching from LocationIQ:", address);
    const url = `https://us1.locationiq.com/v1/search.php`;

    const response = await axios.get(url, {
      params: {
        key: LOCATIONIQ_API_KEY,
        q: address,
        format: "json",
        limit: 1,
      },
    });

    if (!response.data || response.data.length === 0) {
      // throw new Error(`No coordinates found for: ${address}`);
      return {
        longitude: process.env.DEFAULT_LNG,
        latitude: process.env.DEFAULT_LAT,
        address,
      };
    }

    const place = response.data[0];
    return {
      longitude: parseFloat(place.lon),
      latitude: parseFloat(place.lat),
      address: place.display_name,
    };
  } catch (error) {
    return {
      longitude: process.env.DEFAULT_LNG,
      latitude: process.env.DEFAULT_LAT,
      address,
    };
  }
}

export default geocodeAddress;

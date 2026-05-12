import AppError from "../utils/appError.js";
import { markFavouritesForUser } from "../utils/favourites.js";

/**
 * Universal middleware to enrich any model results with `isFavourite`.
 * - Works for arrays (find) and single documents (findById/findOne).
 * - Skips gracefully if no user is logged in (public endpoints).
 */

export const addFavourites = async (userId, data) => {
  try {
    // Handle array results
    if (Array.isArray(data) && data.length > 0) {
      const itemType = data[0].constructor?.modelName;
      if (!itemType) return new AppError("Invalid ItemType", 400); // skips if not a mongoose doc
      return await markFavouritesForUser(userId, data, itemType);
    }

    // Handle single document
    if (data && data.constructor?.modelName) {
      const itemType = data.constructor.modelName;
      const enrichedArr = await markFavouritesForUser(userId, [data], itemType);

      return enrichedArr[0];
    }
  } catch (err) {
    return err;
  }
};

export default addFavourites;

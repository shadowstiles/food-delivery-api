import SavedItem from "../models/savedItemModel.js";

/**
 * Marks items with `isFavourite: true/false` for a given user.
 *
 * @param {ObjectId} userId - The logged-in user ID
 * @param {Array} items - The documents (Restaurant/Product/etc.)
 * @param {String} itemType - The model name ("Restaurant", "Product", etc.)
 * @returns {Array} enriched items with `isFavourite`
 */

export const markFavouritesForUser = async (userId, items, itemType) => {
  try {
    if (!userId || !items || items.length === 0) return items;

    const itemIds = items.map((i) => i._id);

    // Find all SavedItems for this user and these items
    const favourites = await SavedItem.find({
      user: userId,
      item: { $in: itemIds },
      itemType,
    }).lean();

    const favSet = new Set(favourites.map((f) => f.item.toString()));

    // Add isFavourite dynamically
    const result = await Promise.all(
      items.map((i) => {
        const obj = i.toObject ? i.toObject() : i;
        return {
          ...obj,
          isFavourite: favSet.has(i._id.toString()),
        };
      })
    );

    return result;
  } catch (error) {
    // console.log(error);
  }
};

export default markFavouritesForUser;

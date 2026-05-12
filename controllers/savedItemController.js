import SavedItem from "../models/savedItemModel.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

// ➤ Create (save/favourite an item)
export const saveItem = catchAsync(async (req, res, next) => {
  const { itemId, itemType } = req.body;

  const saved = await SavedItem.findOneAndUpdate(
    { authId: req.user._id, item: itemId, itemType },
    { $setOnInsert: { authId: req.user._id, item: itemId, itemType } },
    { new: true, upsert: true }
  );

  res.status(201).json({ status: "success", data: { data: saved } });
});

// ➤ Get all saved items for the logged-in user
export const getSavedItems = catchAsync(async (req, res, next) => {
  const savedItems = await SavedItem.find({ authId: req.user._id })
    .populate("item") // populate the actual Restaurant/Product
    .lean();

  res.status(200).json({ status: "success", data: { savedItems } });
});

// ➤ Get all saved Restaurants for the logged-in user
export const getSavedRestaurant = catchAsync(async (req, res, next) => {
  const savedItems = await SavedItem.find({
    authId: req.user._id,
    itemType: "Restaurant",
  })
    .populate("item") // populate the actual Restaurant
    .lean();

  res.status(200).json({
    status: "success",
    // eslint-disable-next-line no-unused-vars
    data: { data: savedItems.map((e, _) => e.item) },
  });
});

// ➤ Get all saved Products for the logged-in user
export const getSavedProducts = catchAsync(async (req, res, next) => {
  const savedItems = await SavedItem.find({
    authId: req.user._id,
    itemType: "Product",
  })
    .populate("item") // populate the actual Product
    .lean();

  res.status(200).json({
    status: "success",
    // eslint-disable-next-line no-unused-vars
    data: { data: savedItems.map((e, _) => e.item) },
  });
});

// ➤ Get all saved Riders for the logged-in user
export const getSavedRiders = catchAsync(async (req, res, next) => {
  const savedItems = await SavedItem.find({
    authId: req.user._id,
    itemType: "Rider",
  })
    .populate("item") // populate the actual Rider
    .lean();

  res.status(200).json({ status: "success", data: { data: savedItems } });
});

// ➤ Delete (unfavourite an item)
export const removeSavedItem = catchAsync(async (req, res, next) => {
  const { itemId } = req.params;

  const deleted = await SavedItem.findOneAndDelete({
    item: itemId,
    authId: req.user._id,
  });

  if (!deleted) {
    return next(new AppError("Not Found", 404));
  }

  res.status(200).json({ status: "success", message: "Item removed" });
});

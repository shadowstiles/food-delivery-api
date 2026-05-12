import APIFeatures from "../utils/apiFeatures.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

export const deleteOne = (Model, type = "document") =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id || req.body.id);

    if (!doc) {
      return next(new AppError(`No ${type} found with that ID`, 404));
    }

    res.status(204).json({
      status: "success",
      data: null,
    });
  });

export const updateOne = (Model, type = "document") =>
  catchAsync(async (req, res, next) => {
    if (type === "rider") {
      const allowedFields = [
        "availabilityStatus",
        "employmentStatus",
        "bankDetails",
        "vehicle",
        "location",
        "device",
      ];

      const filteredBody = Object.fromEntries(
        Object.entries(req.body).filter(([key]) => allowedFields.includes(key))
      );

      req.body = filteredBody;
    }

    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return next(new AppError(`No ${type} found with that ID`, 404));
    }

    res.status(200).json({
      status: "success",
      data: { data: doc },
    });
  });

export const createOne = (Model, populateOptions) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);

    if (populateOptions) {
      await doc.populate(populateOptions);
    }

    res.status(201).json({
      status: "success",
      data: { data: doc },
    });
  });

export const getOne = (Model, type, populateOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);

    if (populateOptions) {
      query = Model.findById(req.params.id).populate(populateOptions);
    }

    const doc = await query;

    if (!doc) {
      return next(new AppError(`No ${type} found with that ID`, 404));
    }

    res.status(200).json({
      status: "success",
      data: { data: doc },
    });
  });

export const getAll = ({ Model, filter = {} }) =>
  catchAsync(async (req, res, next) => {
    // To allowe for nested get reviees on products
    let queryFilter = { ...filter };

    if (req.params.productId) {
      queryFilter = { product: req.params.productId };
    }

    if (req.params.riderId) {
      queryFilter = { rider: req.params.riderId };
    }

    if (req.params.restaurantId) {
      queryFilter = { restaurant: req.params.restaurantId };
    }

    if (req.params.categoryId) {
      queryFilter = { category: req.params.categoryId };
    }

    // EXECUTE QUERY
    // req.queryParams is a custom created object used to modify req.query properties
    const features = new APIFeatures(
      Model.find(queryFilter),
      req.queryParams || req.query
    )
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const doc = await features.query;

    const count = await Model.countDocuments(queryFilter);

    // Send Response
    res.status(200).json({
      status: "success",
      results: doc.length,
      data: { data: doc, count },
    });
  });

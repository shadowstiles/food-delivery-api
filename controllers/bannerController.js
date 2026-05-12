import * as factory from "./handlerFactory.js";
import Banner from "../models/bannerModel.js";

export const getAllBanner = factory.getAll({ Model: Banner });
export const getBanner = factory.getOne(Banner, "banner");
export const createBanner = factory.createOne(Banner);
export const updateBanner = factory.updateOne(Banner, "banner");
export const deleteBanner = factory.deleteOne(Banner, "banner");

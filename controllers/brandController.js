import * as factory from "./handlerFactory.js";
import Brand from "../models/brandModel.js";

export const getAllBrand = factory.getAll({ Model: Brand });
export const getBrand = factory.getOne(Brand, "brand");
export const createBrand = factory.createOne(Brand);
export const updateBrand = factory.updateOne(Brand, "brand");
export const deleteBrand = factory.deleteOne(Brand, "brand");

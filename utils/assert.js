import AppError from "./appError.js";

export default (cond, message, code) => {
  if (!cond) {
    throw new AppError(message, code);
  }
};

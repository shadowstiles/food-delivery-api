import AppError from "../utils/appError.js";

// --------------------
// Database Error Handlers
// --------------------
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400, true, "INVALID_ID");
};

const handleDuplicateFieldsDB = (err) => {
  let value = "";
  if (err.keyValue) value = Object.values(err.keyValue)[0];
  else if (err.errmsg) {
    const match = err.errmsg.match(/(["'])(\\?.)*?\1/);
    value = match ? match[0] : "duplicate value";
  } else value = "duplicate value";

  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400, true, "DUPLICATE_FIELD");
};

const handleDuplicateFileUpload = (err) => {
  const purpose = err.keyValue?.purpose || "this purpose";
  const message = `You have already uploaded a file for ${purpose}. Please delete the old one first.`;
  return new AppError(message, 400, true, "DUPLICATE_FILE");
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join(". ")}`;
  return new AppError(message, 400, true, "VALIDATION_ERROR", errors);
};

// --------------------
// JWT Errors
// --------------------
const handleJWTError = () =>
  new AppError(
    "Invalid token. Please log in again!",
    401,
    true,
    "INVALID_TOKEN"
  );

const handleJWTExpiredError = () =>
  new AppError(
    "Token expired. Please log in again!",
    401,
    true,
    "TOKEN_EXPIRED"
  );

// --------------------
// Send Error Responses
// --------------------

const sendErrorDev = (err, req, res) => {
  if (req.originalUrl.startsWith("/api")) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      error: err,
      stack: err.stack,
    });
  }

  process.stderr.write(`ERROR: ${err.stack || err.message}\n`);
  return res.status(err.statusCode).render("error", {
    title: "Something went wrong!",
    msg: err.message,
  });
};

const sendErrorProd = (err, req, res) => {
  const isAPI = req.originalUrl.startsWith("/api");

  if (isAPI) {
    return res.status(err.isOperational ? err.statusCode : 500).json({
      status: err.isOperational ? err.status : "error",
      message: err.isOperational ? err.message : "Something went very wrong!",
      errorCode: err.isOperational ? err.errorCode : undefined,
      details: err.isOperational ? err.details : undefined,
    });
  }

  // Rendered website
  return res.status(err.isOperational ? err.statusCode : 500).render("error", {
    title: "Something went wrong!",
    msg: err.isOperational ? err.message : "Please try again later.",
  });
};

// --------------------
// Main Middleware
// --------------------
export default (err, req, res, next) => {
  // If response already sent, delegate to Express default handler
  if (res.headersSent) {
    return next(err);
  }

  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, req, res);
  } else {
    let error = err;

    if (error.name === "CastError") error = handleCastErrorDB(error);
    else if (
      error.code === 11000 &&
      error.keyPattern?.ownerId &&
      error.keyPattern?.purpose
    )
      error = handleDuplicateFileUpload(error);
    else if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    else if (error.name === "ValidationError")
      error = handleValidationErrorDB(error);
    else if (error.name === "JsonWebTokenError") error = handleJWTError();
    else if (error.name === "TokenExpiredError")
      error = handleJWTExpiredError();

    sendErrorProd(error, req, res);
  }
};

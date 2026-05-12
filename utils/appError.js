class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code (default 500)
   * @param {boolean} isOperational - Whether this is an expected operational error
   * @param {string} [errorCode] - Optional machine-readable code for client
   * @param {Array} [details] - Optional array for validation errors, etc.
   */
  constructor(
    message,
    statusCode = 500,
    isOperational = true,
    errorCode = null,
    details = null
  ) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = isOperational;
    this.errorCode = errorCode;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      status: this.status,
      message: this.message,
      statusCode: this.statusCode,
      errorCode: this.errorCode || undefined,
      details: this.details || undefined,
    };
  }
}

export default AppError;

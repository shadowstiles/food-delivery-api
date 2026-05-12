import mongoSanitize from "express-mongo-sanitize";

// Fix for "Cannot set property query of #<IncomingMessage> which has only a getter"
export function mongoSanitizeExpress5() {
  const sanitizer = mongoSanitize.sanitize; // core sanitize function

  return (req, res, next) => {
    if (req.body) {
      Object.assign(req.body, sanitizer(req.body));
    }
    if (req.query) {
      Object.assign(req.query, sanitizer(req.query));
    }
    if (req.params) {
      Object.assign(req.params, sanitizer(req.params));
    }
    next();
  };
}

export default { mongoSanitizeExpress5 };

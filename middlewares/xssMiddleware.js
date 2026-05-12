import xss from "xss";

export default (req, res, next) => {
  const sanitize = (value) => {
    if (typeof value === "string") {
      return xss(value);
    }
    if (Array.isArray(value)) {
      return value.map(sanitize);
    }
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, sanitize(v)])
      );
    }
    return value;
  };

  if (req.body && !Buffer.isBuffer(req.body)) req.body = sanitize(req.body);
  if (req.params) req.params = sanitize(req.params);

  if (req.query) {
    Object.entries(sanitize(req.query)).forEach(([key, value]) => {
      req.query[key] = value;
    });
  }

  next();
};

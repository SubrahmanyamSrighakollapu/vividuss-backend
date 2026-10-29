const { EDITOR_REQUEST_BYTES, DRAFT_REQUEST_BYTES } = require("../lib/documentValidation");

function jsonLimit(req) {
  return /^\/api\/websites\/[^/]+\/draft\/?$/.test(req.path) ? DRAFT_REQUEST_BYTES : EDITOR_REQUEST_BYTES;
}

// Single-process staging protection. Multi-instance production needs a shared limiter.
function mutationLimiter({ limit = 120, windowMs = 60_000, maxKeys = 10_000, now = Date.now } = {}) {
  const entries = new Map();
  return (req, res, next) => {
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
    const time = now();
    for (const [key, entry] of entries) if (entry.until <= time) entries.delete(key);
    const key = req.ip || "unknown";
    let entry = entries.get(key);
    if (!entry) {
      if (entries.size >= maxKeys) return res.status(429).json({ success: false, message: "Too many requests" });
      entry = { count: 0, until: time + windowMs }; entries.set(key, entry);
    }
    if (++entry.count > limit) {
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil((entry.until - time) / 1000))));
      return res.status(429).json({ success: false, message: "Too many requests" });
    }
    return next();
  };
}

function apiError(error, req, res, next) {
  if (res.headersSent) return next(error);
  const status = error.type === "entity.too.large" ? 413 : error.type === "entity.parse.failed" ? 400 : error.statusCode || 500;
  const message = status === 413 ? "JSON request exceeds the size limit" : error.type === "entity.parse.failed" ? "Malformed JSON request" : status < 500 ? error.message : "Internal server error";
  res.status(status).json({ success: false, message });
}
module.exports = { jsonLimit, mutationLimiter, apiError };

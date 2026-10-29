const express = require("express");
const cors = require("cors");
const { clerkMiddleware } = require("@clerk/express");
const { EDITOR_REQUEST_BYTES, DRAFT_REQUEST_BYTES } = require("./lib/documentValidation");
const { jsonLimit, mutationLimiter, apiError } = require("./middleware/requestPolicy");

function createApp({ origins, authenticate = clerkMiddleware(), routes } = {}) {
  if (!Array.isArray(origins) || !origins.length) throw new Error("Explicit CORS origins are required");
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => { res.setHeader("X-Content-Type-Options", "nosniff"); next(); });
  app.use(cors({ origin(origin, callback) {
    if (!origin || origins.includes(origin)) return callback(null, true);
    return callback(Object.assign(new Error("Origin is not allowed"), { statusCode: 403 }));
  } }));
  app.use("/api", mutationLimiter());
  const editorParser = express.json({ limit: EDITOR_REQUEST_BYTES });
  const draftParser = express.json({ limit: DRAFT_REQUEST_BYTES });
  app.use((req, res, next) => (jsonLimit(req) === DRAFT_REQUEST_BYTES ? draftParser : editorParser)(req, res, next));
  app.use(authenticate);
  app.get("/api/health", (req, res) => res.json({ success: true, message: "Website Builder API is running" }));
  const mounted = routes || {
    websites: require("./routes/website.route"),
    templates: require("./routes/template.route"),
    media: require("./routes/media.route"),
    categories: require("./routes/category.route"),
  };
  for (const [name, router] of Object.entries(mounted)) app.use(`/api/${name}`, router);
  if (!routes) {
    const swaggerUi = require("swagger-ui-express");
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(require("./config/swagger")));
  }
  app.use(apiError);
  return app;
}
module.exports = { createApp };

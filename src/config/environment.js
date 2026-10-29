function validateEnvironment(env = process.env) {
  if (env.VIVIDUSS_PUBLICATION_REVISIONS && !["enabled", "disabled"].includes(env.VIVIDUSS_PUBLICATION_REVISIONS)) throw new Error("VIVIDUSS_PUBLICATION_REVISIONS must be enabled or disabled");
  const missing = ["DATABASE_URL", "CLERK_SECRET_KEY", "CLERK_PUBLISHABLE_KEY", "CORS_ORIGINS"].filter(key => !env[key]);
  if (missing.length) throw new Error(`Missing required configuration: ${missing.join(", ")}`);
  const origins = env.CORS_ORIGINS.split(",").map(value => value.trim()).filter(Boolean);
  if (!origins.length || origins.some(origin => {
    try { const url = new URL(origin); return !["http:", "https:"].includes(url.protocol) || url.origin !== origin; }
    catch { return true; }
  })) throw new Error("CORS_ORIGINS must contain explicit http(s) origins without paths or wildcards");
  return { origins };
}
module.exports = { validateEnvironment };

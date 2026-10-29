const path = require("node:path");
const { spawnSync } = require("node:child_process");
// Generation never connects to a database. This placeholder is scoped solely to
// the generate subprocess; migrate/seed/test commands never inherit a fallback.
const env = { ...process.env, DATABASE_URL: process.env.DATABASE_URL || "postgresql://unused:unused@127.0.0.1:1/vividuss_generation_only" };
const result = spawnSync(process.execPath, [path.resolve(__dirname, "../node_modules/prisma/build/index.js"), "generate", "--schema=prisma/schema.prisma"], { env, stdio: "inherit" });
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);

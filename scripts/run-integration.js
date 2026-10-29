const { spawnSync } = require("node:child_process");
const { connectDisposable } = require("./disposable-target");
async function main() {
  if (process.argv.length > 3 || process.argv[2] && process.argv[2] !== "--legacy-only") throw new Error("Only --legacy-only is supported");
  const pattern = process.argv[2] === "--legacy-only" ? "tests/integration/persistence.test.js" : "tests/integration/*.test.js";
  const { prisma, identity } = await connectDisposable();
  await prisma.$disconnect();
  console.log("Verified disposable target: " + identity.name + ", role " + identity.role);
  const result = spawnSync(process.execPath, ["--test", pattern], {
    stdio: "inherit", env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL, VIVIDUSS_PUBLICATION_REVISIONS: "disabled" },
  });
  process.exitCode = result.status ?? 1;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

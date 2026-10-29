const { spawnSync } = require("node:child_process");
const { connectDisposable } = require("./disposable-target");
async function main() {
  const { prisma, identity } = await connectDisposable();
  await prisma.$disconnect();
  console.log("Verified disposable target: " + identity.name + ", role " + identity.role);
  const result = spawnSync(process.execPath, ["--test", "tests/integration/*.test.js"], {
    stdio: "inherit", env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
  });
  process.exitCode = result.status ?? 1;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

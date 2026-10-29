const { PrismaClient } = require("@prisma/client");
const MARKER = "vividuss-disposable-milestone-1.5";
async function connectDisposable() {
  const url = process.env.TEST_DATABASE_URL;
  if (process.env.ALLOW_DATABASE_WRITES !== "disposable" || !url || url !== process.env.DISPOSABLE_DATABASE_URL) {
    throw new Error("Refusing writes: explicit matching disposable URLs and ALLOW_DATABASE_WRITES=disposable are required");
  }
  const target = new URL(url);
  if (!["127.0.0.1", "localhost"].includes(target.hostname) || target.username !== "vividuss_test" || !/^\/vividuss_disposable_m15(?:_[a-z]+)?$/.test(target.pathname)) {
    throw new Error("Refusing target: only loopback vividuss_disposable_m15 databases owned by vividuss_test are allowed");
  }
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const [identity] = await prisma.$queryRawUnsafe("SELECT current_database() AS name, current_user AS role, shobj_description(oid, 'pg_database') AS marker FROM pg_database WHERE datname=current_database()");
    if (identity.name !== target.pathname.slice(1) || identity.role !== "vividuss_test" || identity.marker !== MARKER) throw new Error("Disposable database identity/marker mismatch");
    return { prisma, identity };
  } catch (error) { await prisma.$disconnect(); throw error; }
}
module.exports = { connectDisposable, MARKER };

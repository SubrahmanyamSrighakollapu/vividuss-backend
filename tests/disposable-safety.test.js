const { test } = require("node:test");
const assert = require("node:assert/strict");
const { connectDisposable } = require("../scripts/disposable-target");
const { canonical } = require("../scripts/rehearse-data");

test("integration guard rejects missing opt-in, remote hosts and production-like targets before connecting", async () => {
  const keys = ["TEST_DATABASE_URL", "DISPOSABLE_DATABASE_URL", "ALLOW_DATABASE_WRITES"];
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  try {
    for (const key of keys) delete process.env[key];
    await assert.rejects(connectDisposable(), /Refusing writes/);
    for (const url of [
      "postgresql://vividuss_test:unused@db.example.test/vividuss_disposable_m15",
      "postgresql://postgres:unused@127.0.0.1/production",
      "postgresql://vividuss_test:unused@127.0.0.1/vividuss_production",
    ]) {
      process.env.TEST_DATABASE_URL = url;
      process.env.DISPOSABLE_DATABASE_URL = url;
      process.env.ALLOW_DATABASE_WRITES = "disposable";
      await assert.rejects(connectDisposable(), /Refusing target/);
    }
  } finally {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key];
    }
  }
});
test("canonical preservation checks sort object keys while preserving arrays, Unicode and dates", () => {
  assert.equal(canonical({ b: ["世界", true, null], a: new Date("2026-01-01T00:00:00Z") }), canonical({ a: new Date("2026-01-01T00:00:00Z"), b: ["世界", true, null] }));
  assert.notEqual(canonical([1, 2]), canonical([2, 1]));
});

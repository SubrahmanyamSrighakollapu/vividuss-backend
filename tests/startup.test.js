const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");

test("real backend starts without ImageKit and Clerk rejects missing/invalid tokens", async t => {
  const child = spawn(process.execPath, ["src/server.js"], {
    cwd: path.resolve(__dirname, ".."),
    env: {
      ...process.env,
      PORT: "0", DATABASE_URL: "postgresql://unused:unused@127.0.0.1:1/vividuss_startup_only",
      CLERK_SECRET_KEY: "sk_test_startup_only", CLERK_PUBLISHABLE_KEY: "pk_test_" + Buffer.from("clerk.example.test$").toString("base64"),
      CORS_ORIGINS: "http://localhost:3000", IMAGEKIT_PRIVATE_KEY: "", IMAGEKIT_PUBLIC_KEY: "", IMAGEKIT_URL_ENDPOINT: "",
    }, stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(() => { child.kill(); });
  let output = "";
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Startup timed out: " + output)), 15_000);
    const consume = chunk => {
      output += chunk;
      const match = output.match(/Backend listening on port (\d+)/);
      if (match) { clearTimeout(timer); resolve(Number(match[1])); }
    };
    child.stdout.on("data", consume); child.stderr.on("data", consume);
    child.once("error", error => { clearTimeout(timer); reject(error); });
    child.once("exit", code => { clearTimeout(timer); reject(new Error(`Backend exited ${code}: ${output}`)); });
  });
  const base = `http://127.0.0.1:${port}/api`;
  assert.equal((await fetch(base + "/health")).status, 200);
  for (const endpoint of ["/websites/w/pages/p/editor-data", "/websites/w/publish", "/media/upload"]) {
    const method = endpoint.endsWith("editor-data") ? "PUT" : "POST";
    const response = await fetch(base + endpoint, { method, headers: { "Content-Type": "application/json" }, body: "{}" });
    assert.equal(response.status, 401, endpoint);
  }
  const invalid = await fetch(base + "/websites/w/publish", { method: "POST", headers: { Authorization: "Bearer invalid" } });
  assert.ok([401, 403].includes(invalid.status), "invalid token must not reach publication");
});

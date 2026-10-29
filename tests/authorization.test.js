const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const { createApp } = require("../src/app");

// Dependency doubles are restricted to this loader. Production always uses Clerk.
function load(relative, overrides) {
  const file = path.resolve(__dirname, relative);
  const realRequire = createRequire(file);
  const module = { exports: {} };
  new Function("require", "module", "exports", fs.readFileSync(file, "utf8"))(
    name => Object.hasOwn(overrides, name) ? overrides[name] : realRequire(name), module, module.exports,
  );
  return module.exports;
}
const clerk = {
  getAuth: req => ({ userId: req.testIdentity || null }),
  clerkClient: { users: { getUser: async userId => ({ publicMetadata: { role: userId === "admin" ? "admin" : "member" }, emailAddresses: [{ emailAddress: "laptopuse01824x@gmail.com" }] }) } },
};

test("actual admin/media route middleware with simulated identities: 401, 403, admin inventory and pre-upload authentication", async t => {
  const requireAdmin = load("../src/middleware/requireAdmin.js", { "@clerk/express": clerk });
  const requireUser = load("../src/middleware/requireUser.js", { "@clerk/express": clerk });
  const controller = load("../src/controllers/category.controller.js", { "../services/category.service": { getAllCategories: async options => [{ inactive: options.includeInactive }] } });
  const categories = load("../src/routes/category.route.js", {
    "../middleware/requireAdmin": requireAdmin, "../controllers/category.controller": controller,
  });
  let uploadCalls = 0;
  const names = ["getMediaAssets", "getMediaAsset", "createMediaAsset", "uploadMediaAsset", "updateMediaAsset", "deleteMediaAsset"];
  const media = load("../src/routes/media.route.js", {
    "../middleware/requireUser": requireUser,
    "../controllers/media.controller": Object.fromEntries(names.map(name => [name, (req, res) => { uploadCalls++; res.json({ success: true }); }])),
  });
  const app = createApp({ origins: ["http://localhost:3000"], authenticate(req, res, next) { req.testIdentity = req.headers["x-test-identity"]; next(); }, routes: { categories, media } });
  const server = app.listen(0, "127.0.0.1"); await new Promise(resolve => server.once("listening", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  assert.equal((await fetch(base + "/categories/admin?includeInactive=true")).status, 401);
  assert.equal((await fetch(base + "/categories/admin", { headers: { "x-test-identity": "member" } })).status, 403);
  let response = await fetch(base + "/categories/admin?includeInactive=true", { headers: { "x-test-identity": "admin" } });
  assert.equal(response.status, 200); assert.equal((await response.json()).data[0].inactive, true);
  response = await fetch(base + "/categories?includeInactive=true"); assert.equal((await response.json()).data[0].inactive, false);
  response = await fetch(base + "/media/upload", { method: "POST", headers: { "Content-Type": "multipart/form-data" }, body: "invalid multipart" });
  assert.equal(response.status, 401); assert.equal(uploadCalls, 0);
  const form = new FormData(); form.append("file", new Blob(["<svg></svg>"], { type: "image/svg+xml" }), "x.svg");
  response = await fetch(base + "/media/upload", { method: "POST", headers: { "x-test-identity": "member" }, body: form });
  assert.equal(response.status, 400); assert.equal(uploadCalls, 0);
});

test("save and publish controllers reject missing identity without service calls", async () => {
  let calls = 0;
  const controller = load("../src/controllers/website.controller.js", {
    "@clerk/express": clerk,
    "../services/website.service": { saveWebsitePageEditorData() { calls++; }, publishWebsite() { calls++; } },
  });
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json() {} };
  await controller.savePageEditorData({}, res); assert.equal(res.statusCode, 401);
  await controller.publishWebsite({}, res); assert.equal(res.statusCode, 401); assert.equal(calls, 0);
});

test("website service enforces owner scope; failed publication preserves snapshot", async () => {
  let writes = 0;
  const queries = [];
  const snapshot = { schemaVersion: 1, name: "previous" };
  const website = { id: "w", name: "new", slug: "safe-slug", publishedData: snapshot, isPublished: true, pages: [{ id: "p", name: "Home", slug: "home", order: 0, editorData: null, sections: [] }] };
  const prisma = {
    websitePage: { findFirst: async query => { queries.push(query); return null; } },
    website: { findFirst: async query => { queries.push(query); return query.where.userId === "owner" ? website : null; }, update: async () => { writes++; throw new Error("database failed"); } },
    $transaction: async callback => callback(prisma),
  };
  const service = load("../src/services/website.service.js", { "../lib/prisma": prisma });
  await assert.rejects(service.saveWebsitePageEditorData("w", "p", { root: {}, content: [] }, {}, "other"), /unauthorized/);
  assert.equal(queries[0].where.website.userId, "other");
  await assert.rejects(service.publishWebsite("w", "other"), /unauthorized/); assert.equal(writes, 0);
  await assert.rejects(service.publishWebsite("w", "owner"), /database failed/);
  assert.deepEqual(website.publishedData, { schemaVersion: 1, name: "previous" });
  assert.equal(website.isPublished, true);
});

test("media service scopes lookup and rejects cross-user mutation", async () => {
  let writes = 0; const queries = [];
  const prisma = { mediaAsset: { findFirst: async q => { queries.push(q); return null; }, update() { writes++; }, delete() { writes++; } } };
  const service = load("../src/services/media.service.js", { "@prisma/client": { PrismaClient: class { constructor() { return prisma; } } }, "./storage.service": {} });
  await assert.rejects(service.updateMediaAsset("asset", "other", {}), /not found/);
  await assert.rejects(service.deleteMediaAsset("asset", "other"), /not found/);
  assert.equal(queries[0].where.userId, "other"); assert.equal(writes, 0);
});

test("global layout GET does not persist defaults and explicit save preserves customized JSON", async () => {
  const writes = [];
  const prisma = { template: {
    findUnique: async () => ({ id: "t", globalLayout: null }),
    update: async query => { writes.push(query); return { id: "t", globalLayout: query.data.globalLayout }; },
  } };
  const service = load("../src/services/template.service.js", { "../lib/prisma": prisma });
  const result = await service.getGlobalLayout("t");
  assert.equal(result.globalLayout.header.enabled, false); assert.equal(writes.length, 0);
  const layout = { custom: 1, header: { enabled: true, custom: 2, links: [{ label: "Home", href: "/", custom: 3 }] }, footer: { custom: 4 } };
  await service.saveGlobalLayout("t", layout);
  assert.deepEqual(writes[0].data.globalLayout, layout);
});

test("editor-data service refuses legacy replacement before any update", async () => {
  let writes = 0;
  const page = { id: "p", editorData: null, _count: { sections: 2 } };
  const prisma = { websitePage: { findFirst: async () => page, update: async () => { writes++; } } };
  const service = load("../src/services/website.service.js", { "../lib/prisma": prisma });
  await assert.rejects(service.saveWebsitePageEditorData("w", "p", { root: {}, content: [] }, {}, "owner"), { statusCode: 409 });
  assert.equal(writes, 0); assert.equal(page.editorData, null);
});

test("draft controller preserves validation status codes", async () => {
  const controller = load("../src/controllers/website.controller.js", {
    "@clerk/express": clerk,
    "../services/website.service": { saveWebsiteDraft: async () => { throw Object.assign(new Error("too large"), { statusCode: 413 }); } },
  });
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; } };
  await controller.saveWebsiteDraft({ testIdentity: "owner", params: { id: "w" }, body: { pages: [] } }, res);
  assert.equal(res.statusCode, 413); assert.equal(res.body.success, false);
});

test("SVG disguised as PNG is rejected before provider upload", async () => {
  let uploads = 0;
  const controller = load("../src/controllers/media.controller.js", {
    "@clerk/express": clerk,
    "../services/media.service": {},
    "../services/storage.service": { upload() { uploads++; } },
  });
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json() {} };
  await controller.uploadMediaAsset({ testIdentity: "owner", file: { buffer: Buffer.from("<svg></svg>"), size: 11, mimetype: "image/png" } }, res);
  assert.equal(res.statusCode, 400); assert.equal(uploads, 0);
});

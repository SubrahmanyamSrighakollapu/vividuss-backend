const { test } = require("node:test");
const assert = require("node:assert/strict");
const { validateEditorDocument, MAX_EDITOR_DOCUMENT_BYTES, assertPuckEditable } = require("../src/lib/documentValidation");
const { withLayoutDefaults } = require("../src/lib/globalLayout");
const { validateEnvironment } = require("../src/config/environment");
const { isAllowedImageMime, detectImageMime } = require("../src/lib/fileValidation");

test("document byte boundaries and malformed envelopes", () => {
  const data = { root: { props: {} }, content: [], text: "" };
  const overhead = Buffer.byteLength(JSON.stringify(data));
  data.text = "a".repeat(MAX_EDITOR_DOCUMENT_BYTES - overhead);
  assert.equal(validateEditorDocument(data), data);
  data.text += "é";
  assert.throws(() => validateEditorDocument(data), { statusCode: 413 });
  assert.throws(() => validateEditorDocument({ content: [], root: [] }), { statusCode: 400 });
});
test("layout defaults preserve unknown fields without mutation", () => {
  const saved = { custom: { a: 1 }, header: { enabled: true, links: [{ label: "A", href: "/a", tracking: 1 }], custom: 2 } };
  const before = JSON.stringify(saved);
  const result = withLayoutDefaults(saved);
  assert.equal(JSON.stringify(saved), before);
  assert.deepEqual(result.header.links, saved.header.links);
  assert.equal(result.custom.a, 1);
  assert.equal(result.header.custom, 2);
  assert.equal(withLayoutDefaults(null).header.enabled, false);
});
test("environment requires explicit origins and core settings", () => {
  assert.throws(() => validateEnvironment({}), /Missing required/);
  const env = { DATABASE_URL: "unused", CLERK_SECRET_KEY: "unused", CLERK_PUBLISHABLE_KEY: "unused", CORS_ORIGINS: "http://localhost:3000" };
  assert.deepEqual(validateEnvironment(env).origins, ["http://localhost:3000"]);
  assert.throws(() => validateEnvironment({ ...env, CORS_ORIGINS: "*" }), /explicit/);
});
test("new SVG uploads are rejected even when content detection recognizes them", () => {
  assert.equal(detectImageMime(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')), "image/svg+xml");
  assert.equal(isAllowedImageMime("image/svg+xml"), false);
  assert.equal(isAllowedImageMime("image/png"), true);
});
test("optional media configuration is lazy", () => {
  const old = process.env.IMAGEKIT_PRIVATE_KEY;
  delete process.env.IMAGEKIT_PRIVATE_KEY;
  try {
    const storage = require("../src/services/storage.service");
    assert.equal(typeof storage.upload, "function");
    assert.throws(() => require("../src/config/imagekit").getImageKit(), { statusCode: 503 });
  } finally { if (old !== undefined) process.env.IMAGEKIT_PRIVATE_KEY = old; }
});
test("legacy documents cannot be implicitly replaced by Puck; migrated pages remain editable", () => {
  const page = { editorData: null, sections: [{ type: "hero", content: { heading: "preserve" } }] };
  const before = JSON.stringify(page);
  assert.throws(() => assertPuckEditable(page), { statusCode: 409 });
  assert.equal(JSON.stringify(page), before);
  assert.doesNotThrow(() => assertPuckEditable({ ...page, editorData: { root: {}, content: [] } }));
});

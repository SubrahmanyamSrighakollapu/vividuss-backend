const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { connectDisposable } = require("../../scripts/disposable-target");
let prisma, service, templates;
before(async () => {
  if (process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL) throw new Error("Integration service URL must match the verified disposable URL");
  ({ prisma } = await connectDisposable());
  service = require("../../src/services/website.service");
  templates = require("../../src/services/template.service");
});
after(async () => { await prisma?.$disconnect(); if (service) await require("../../src/lib/prisma").$disconnect(); });
const document = text => ({ root: { props: { responsive: { mobile: { paddingX: "16px" } } } }, content: [{ type: "Heading", props: { id: "heading-fixture", text, level: "h1", responsive: { mobile: { fontSize: 24 } }, unknown: { preserve: true } } }] });
async function fixture(t) {
  const id = "m15-check-" + crypto.randomBytes(6).toString("hex");
  const website = await prisma.website.create({ data: { id, name: "Fixture", slug: id, userId: "m15-owner", pages: { create: { id: id + "-home", name: "Home", slug: "home", order: 0, editorData: document("Before") } } }, include: { pages: true } });
  t.after(async () => { await prisma.website.delete({ where: { id } }); });
  return website;
}
test("real PostgreSQL editor JSON save/reload preserves responsive and unknown props", async t => {
  const site = await fixture(t), page = site.pages[0];
  const data = document("Persisted café 世界");
  await service.saveWebsitePageEditorData(site.id, page.id, data, undefined, "m15-owner");
  const reloaded = await service.getWebsitePageEditorData(site.id, page.id, "m15-owner");
  assert.deepEqual(reloaded.editorData, data);
  assert.deepEqual(reloaded.responsive, data.root.props.responsive);
});
test("real PostgreSQL publication snapshots latest saved pages and isolates subsequent draft edits", async t => {
  const site = await fixture(t);
  const other = await service.createWebsitePage(site.id, { name: "About", slug: "about" }, "m15-owner");
  await service.saveWebsitePageEditorData(site.id, site.pages[0].id, document("Latest"), undefined, "m15-owner");
  await service.saveWebsitePageEditorData(site.id, other.id, { ...other.editorData, content: [{ type: "Heading", props: { id: "about-heading", text: "About latest" } }] }, undefined, "m15-owner");
  await service.publishWebsite(site.id, "m15-owner");
  const publication = await service.getPublishedWebsiteBySlug(site.slug);
  assert.equal(publication.publishedData.pages.length, 2);
  assert.equal(publication.publishedData.pages[0].editorData.content[0].props.text, "Latest");
  await service.saveWebsitePageEditorData(site.id, site.pages[0].id, document("Unpublished"), undefined, "m15-owner");
  assert.deepEqual((await service.getPublishedWebsiteBySlug(site.slug)).publishedData, publication.publishedData);
});
test("real PostgreSQL owner checks and failed saves preserve persisted JSON", async t => {
  const site = await fixture(t), page = site.pages[0];
  await assert.rejects(service.saveWebsitePageEditorData(site.id, page.id, document("intrusion"), {}, "other-user"), /unauthorized/);
  await assert.rejects(service.publishWebsite(site.id, "other-user"), /unauthorized/);
  await assert.rejects(service.saveWebsitePageEditorData(site.id, page.id, { content: null }, {}, "m15-owner"), /Invalid/);
  assert.deepEqual((await prisma.websitePage.findUnique({ where: { id: page.id } })).editorData, page.editorData);
});
test("real transaction failure leaves previous publication intact", async t => {
  const site = await fixture(t); await service.publishWebsite(site.id, "m15-owner");
  const before = await prisma.website.findUnique({ where: { id: site.id } });
  const name = "m15_fail_" + crypto.randomBytes(6).toString("hex");
  await prisma.$executeRawUnsafe(`CREATE FUNCTION ${name}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id = '${site.id}' THEN RAISE EXCEPTION 'm15 simulated publication failure'; END IF; RETURN NEW; END $$`);
  try {
    await prisma.$executeRawUnsafe(`CREATE TRIGGER ${name} BEFORE UPDATE ON "Website" FOR EACH ROW EXECUTE FUNCTION ${name}()`);
    try { await assert.rejects(service.publishWebsite(site.id, "m15-owner"), /m15 simulated publication failure/); }
    finally { await prisma.$executeRawUnsafe(`DROP TRIGGER ${name} ON "Website"`); }
  } finally { await prisma.$executeRawUnsafe(`DROP FUNCTION ${name}()`); }
  const after = await prisma.website.findUnique({ where: { id: site.id } });
  assert.deepEqual(after.publishedData, before.publishedData);
  assert.deepEqual(after.publishedAt, before.publishedAt);
  assert.equal(after.isPublished, before.isPublished);
});
test("global layout defaults are read-only; explicit partial/unknown JSON round-trips", async t => {
  const id = "m15-template-" + crypto.randomBytes(6).toString("hex");
  await prisma.template.create({ data: { id, name: "Test", category: "Agency", status: "DRAFT" } });
  t.after(() => prisma.template.delete({ where: { id } }));
  const before = await prisma.template.findUnique({ where: { id } });
  assert.equal((await templates.getGlobalLayout(id)).globalLayout.header.enabled, false);
  assert.deepEqual(await prisma.template.findUnique({ where: { id } }), before);
  const layout = { header: { enabled: true, links: [{ href: "/", label: "Home", unknown: 1 }] }, footer: {}, unknown: { preserve: true } };
  await templates.saveGlobalLayout(id, layout);
  assert.deepEqual((await prisma.template.findUnique({ where: { id } })).globalLayout, layout);
  assert.equal((await templates.getGlobalLayout(id)).globalLayout.unknown.preserve, true);
});
test("legacy fixtures remain readable and cannot be implicitly replaced by Puck", async () => {
  const template = await prisma.template.findUnique({ where: { id: "legacy-t" }, include: { pages: { include: { sections: true } } } });
  assert.equal(template.pages[0].sections[0].content.heading, "Legacy café — preserved");
  const publication = await service.getPublishedWebsiteBySlug("m15-legacy");
  assert.equal(publication.publishedData.pages[0].sections[0].content.unknown.nested[3], "世界");
  await assert.rejects(service.saveWebsitePageEditorData("legacy-w", "legacy-wp", document("replace"), {}, "fixture-owner"), { statusCode: 409 });
});

test("canonical PostgreSQL documents persist, reject unsafe edits and downgrade, and fork identity on duplication", async t => {
  const site = await fixture(t);
  const page = await service.createWebsitePage(site.id, { name: "Canonical", slug: "canonical" }, "m15-owner");
  assert.equal(page.editorData.format, "vividuss.puck.page");
  const document = { ...page.editorData, content: [{ type: "Section", props: { id: "s", content: [{ type: "Heading", props: { id: "h", text: "Canonical café 世界", responsive: { mobile: { fontSize: 24 } } } }] } }] };
  await service.saveWebsitePageEditorData(site.id, page.id, document, undefined, "m15-owner");
  assert.deepEqual((await service.getWebsitePageEditorData(site.id, page.id, "m15-owner")).editorData, document);
  await service.publishWebsite(site.id, "m15-owner");
  const published = (await service.getPublishedWebsiteBySlug(site.slug)).publishedData;
  const bad = structuredClone(document); bad.content[0].props.content[0].props.responsive.mobile.fontSize = "unsafe";
  await assert.rejects(service.saveWebsitePageEditorData(site.id, page.id, bad, undefined, "m15-owner"), { statusCode: 400 });
  await assert.rejects(service.saveWebsitePageEditorData(site.id, page.id, { root: { props: {} }, content: [] }, undefined, "m15-owner"), { statusCode: 400 });
  assert.deepEqual((await prisma.websitePage.findUnique({ where: { id: page.id } })).editorData, document);
  assert.deepEqual((await service.getPublishedWebsiteBySlug(site.slug)).publishedData, published);
  const duplicate = await service.duplicateWebsitePage(site.id, page.id, "m15-owner");
  assert.notEqual(duplicate.editorData.documentId, document.documentId);
  assert.deepEqual(duplicate.editorData.content, document.content);
});

test("invalid canonical page rolls back earlier updates in multi-page draft transaction", async t => {
  const site = await fixture(t);
  const other = await service.createWebsitePage(site.id, { name: "Canonical", slug: "canonical" }, "m15-owner");
  await service.publishWebsite(site.id, "m15-owner");
  const before = await prisma.website.findUnique({ where: { id: site.id }, include: { pages: { orderBy: { order: "asc" } } } });
  const bad = { ...other.editorData, content: [{ type: "Button", props: { id: "bad", href: "javascript:alert(1)" } }] };
  await assert.rejects(service.saveWebsiteDraft(site.id, [{ id: site.pages[0].id, editorData: document("Must roll back") }, { id: other.id, editorData: bad }], "m15-owner"), { statusCode: 400 });
  const after = await prisma.website.findUnique({ where: { id: site.id }, include: { pages: { orderBy: { order: "asc" } } } });
  assert.deepEqual(after, before);
});

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { connectDisposable } = require("../../scripts/disposable-target");
const { requests } = require("../../src/lib/publicationContext");
const { createPageDocument } = require("../../shared/website-contract/index.cjs");
let prisma, service, publication;
const owner = "m3-test-owner";
const run = (state, operation) => requests.run({ draftVersion: state?.draftVersion ?? 0, publicationVersion: state?.publicationVersion ?? 0 }, operation);
before(async () => {
  if (process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL) throw new Error("Service target mismatch");
  ({ prisma } = await connectDisposable());
  process.env.VIVIDUSS_PUBLICATION_REVISIONS = "enabled";
  service = require("../../src/services/website.service");
  publication = require("../../src/services/publication.service");
  await publication.assertSchemaReady();
});
after(async () => { await prisma?.$disconnect(); if (service) await require("../../src/lib/prisma").$disconnect(); });
// History fixtures deliberately remain until the whole owned tmpfs container is
// removed. Never disable immutability or implement revision deletion for cleanup.
async function fixture({ legacy = false } = {}) {
  const id = "m3-" + crypto.randomBytes(6).toString("hex");
  const document = createPageDocument(id + "-doc", { title: "Home" });
  document.metadata = { title: "Published SEO", description: "Frozen description" };
  document.content = [{ type: "Heading", props: { id: "heading", text: "Original" } }];
  return prisma.website.create({ data: { id, name: "Original site", slug: id, userId: owner, theme: { colors: { primary: "#111111" } },
    ...(legacy ? { isPublished: true, publishedAt: new Date("2020-01-01"), publishedData: { schemaVersion: 1, name: "Old legacy publication", unknown: { keep: ["caf?", true, null] }, pages: [{ id: id + "-home", name: "Home", slug: "home", sections: [{ id: id + "-section", type: "hero", content: { heading: "Legacy output" }, config: {} }] }] } } : {}),
    pages: { create: [
      { id: id + "-home", name: "Home", slug: "home", order: 0, ...(legacy ? {} : { editorData: document }),
        sections: { create: { id: id + "-section", type: "hero", order: 0, content: { heading: "Legacy output" }, config: {} } } },
      { id: id + "-about", name: "About", slug: "about", order: 1, editorData: createPageDocument(id + "-about-doc") },
    ] } }, include: { pages: { orderBy: { order: "asc" } } } });
}
const state = site => publication.getState(site.id, owner);
const publish = async site => run(await state(site), () => service.publishWebsite(site.id, owner));
test("revision reads are non-writing; missing tokens and unauthorized calls do not initialize state", async () => {
  const site = await fixture();
  assert.equal((await state(site)).draftVersion, 0);
  assert.equal(await prisma.websitePublicationState.count({ where: { websiteId: site.id } }), 0);
  await assert.rejects(service.publishWebsite(site.id, owner), { statusCode: 428 });
  await assert.rejects(publication.getState(site.id, "other"), { statusCode: 404 });
  await assert.rejects(run({}, () => service.publishWebsite(site.id, "other")), { statusCode: 404 });
  assert.equal(await prisma.websitePublicationState.count({ where: { websiteId: site.id } }), 0);
});
test("first and repeated multi-page publication create immutable complete snapshots", async () => {
  const site = await fixture(), first = await publish(site);
  assert.equal(first.revision.sequence, 1);
  const original = await publication.getRevision(site.id, first.revision.id, owner);
  assert.equal(original.snapshot.pages.length, 2); assert.equal(original.actorId, owner);
  assert.equal(original.snapshot.pages[0].editorData.metadata.title, "Published SEO");
  const second = await publish(site);
  assert.equal(second.revision.sequence, 2);
  assert.deepEqual(await publication.getRevision(site.id, first.revision.id, owner), original);
  assert.equal((await service.getPublishedWebsiteBySlug(site.slug)).publication.revisionId, second.revision.id);
});
test("two tabs saving the same page have exactly one winner and a 409 stale conflict", async () => {
  const site = await fixture(), page = site.pages[0];
  const a = structuredClone(page.editorData), b = structuredClone(page.editorData);
  a.content[0].props.text = "Tab A"; b.content[0].props.text = "Tab B";
  const results = await Promise.allSettled([a,b].map(doc => run({}, () => service.saveWebsitePageEditorData(site.id, page.id, doc, undefined, owner))));
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  const error = results.find(r => r.status === "rejected").reason;
  assert.equal(error.statusCode, 409); assert.equal(error.code, "VERSION_CONFLICT");
  assert.equal((await state(site)).draftVersion, 1);
  const saved = await service.getWebsitePageEditorData(site.id, page.id, owner);
  assert.equal(saved.concurrency.draftVersion, 1);
  assert.ok(["Tab A","Tab B"].includes(saved.editorData.content[0].props.text));
});
test("two simultaneous publishers and repeated requests cannot create duplicate publication events", async () => {
  const site = await fixture();
  const results = await Promise.allSettled([1,2].map(() => run({}, () => service.publishWebsite(site.id, owner))));
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  assert.equal(results.find(r => r.status === "rejected").reason.statusCode, 409);
  await assert.rejects(run({}, () => service.publishWebsite(site.id, owner)), { statusCode: 409 });
  assert.equal(await prisma.websiteRevision.count({ where: { websiteId: site.id } }), 1);
});
test("all website/page/section mutation entry points reject stale website tokens", async () => {
  const site = await fixture(), page = site.pages[0], section = site.id + "-section";
  await run({}, () => service.updateWebsite(site.id, { name: "Changed" }, owner));
  const calls = [
    () => service.updateWebsite(site.id, { name: "stale" }, owner),
    () => service.createWebsitePage(site.id, { name: "New" }, owner),
    () => service.updateWebsitePage(page.id, { name: "stale" }, owner),
    () => service.deleteWebsitePage(page.id, owner),
    () => service.saveWebsitePageEditorData(site.id, page.id, page.editorData, undefined, owner),
    () => service.duplicateWebsitePage(site.id, page.id, owner),
    () => service.reorderWebsitePages(site.id, site.pages.map(p=>p.id), owner),
    () => service.updateWebsiteSection(section, { content: {} }, owner),
    () => service.deleteWebsiteSection(section, owner),
    () => service.createWebsiteSection(page.id, { type: "hero", content: {} }, owner),
    () => service.reorderWebsiteSections({ pageId: page.id, sections: [{id:section}], userId: owner }),
    () => service.saveWebsiteDraft(site.id, [{ id: page.id, name: "stale" }], owner),
  ];
  for (const call of calls) await assert.rejects(run({}, call), { statusCode: 409 });
  assert.equal((await state(site)).draftVersion, 1);
  assert.equal((await prisma.websitePage.findUnique({ where: { id: page.id } })).name, "Home");
});
test("draft names/slugs/SEO/theme/layout do not leak; publication slug stays reserved", async () => {
  const site = await fixture();
  const chrome = { header: { enabled: true, logoText: "Frozen brand", links: [{ label: "About", href: "/about" }] }, footer: { enabled: true, copyrightText: "Frozen footer" } };
  await run(await state(site), () => publication.setLayout(site.id, owner, chrome));
  await publish(site);
  const before = await service.getPublishedWebsiteBySlug(site.slug);
  await run(await state(site), () => service.updateWebsite(site.id, { name: "Draft site", slug: site.slug + "-draft", theme: { colors: { primary: "#ffffff" } } }, owner));
  await run(await state(site), () => service.updateWebsitePage(site.pages[0].id, { slug: "renamed-home" }, owner));
  const document = structuredClone(site.pages[0].editorData); document.metadata.title = "Draft SEO";
  await run(await state(site), () => service.saveWebsitePageEditorData(site.id, site.pages[0].id, document, undefined, owner));
  await run(await state(site), () => publication.setLayout(site.id, owner, { header: { enabled: false } }));
  assert.deepEqual(await service.getPublishedWebsiteBySlug(site.slug), before);
  assert.equal(await service.getPublishedWebsiteBySlug(site.slug + "-draft"), null);
  assert.deepEqual(before.publishedData.globalLayout, chrome);
  const other = await fixture();
  await run({}, () => service.updateWebsite(other.id, { slug: site.slug }, owner));
  await assert.rejects(publish(other), { statusCode: 409 });
});
test("invalid second page rejects publication without changing previous history or active pointer", async () => {
  const site = await fixture(); await publish(site);
  const before = await service.getPublishedWebsiteBySlug(site.slug);
  const version = await state(site);
  await prisma.websitePage.update({ where: { id: site.pages[1].id }, data: { editorData: { ...site.pages[1].editorData, content: [{type:"Unknown",props:{id:"bad"}}] } } });
  await assert.rejects(publish(site), { statusCode: 400 });
  assert.deepEqual(await service.getPublishedWebsiteBySlug(site.slug), before);
  assert.deepEqual(await state(site), version);
  assert.equal(await prisma.websiteRevision.count({ where: { websiteId: site.id } }), 1);
});
test("invalid second-page draft rolls back earlier page writes AND version increment", async () => {
  const site = await fixture(), before = await service.getWebsiteById(site.id, owner);
  const invalid = { ...site.pages[1].editorData, content: [{type:"Unknown",props:{id:"bad"}}] };
  await assert.rejects(run({}, () => service.saveWebsiteDraft(site.id, [{ id: site.pages[0].id, name: "Must roll back" }, { id: site.pages[1].id, editorData: invalid }], owner)), { statusCode: 400 });
  assert.deepEqual(await service.getWebsiteById(site.id, owner), before);
});
test("forced database failure rolls back inserted revision, active pointer, cache and publication counter", async () => {
  const site = await fixture(); await publish(site);
  const before = await service.getPublishedWebsiteBySlug(site.slug), version = await state(site);
  const name = "m3_fail_" + crypto.randomBytes(6).toString("hex");
  await prisma.$executeRawUnsafe("CREATE FUNCTION " + name + "() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id = '" + site.id + "' THEN RAISE EXCEPTION 'm3 forced failure'; END IF; RETURN NEW; END $$");
  try {
    await prisma.$executeRawUnsafe('CREATE TRIGGER ' + name + ' BEFORE UPDATE ON "Website" FOR EACH ROW EXECUTE FUNCTION ' + name + '()');
    try { await assert.rejects(publish(site), /m3 forced failure/); }
    finally { await prisma.$executeRawUnsafe('DROP TRIGGER ' + name + ' ON "Website"'); }
  } finally { await prisma.$executeRawUnsafe("DROP FUNCTION " + name + "()"); }
  assert.deepEqual(await service.getPublishedWebsiteBySlug(site.slug), before);
  assert.deepEqual(await state(site), version);
  assert.equal(await prisma.websiteRevision.count({ where: { websiteId: site.id } }), 1);
});
test("history is owner-scoped; repeated restoration creates traceable new revisions without modifying drafts", async () => {
  const site = await fixture(), first = await publish(site);
  const source = await publication.getRevision(site.id, first.revision.id, owner);
  await run(await state(site), () => service.updateWebsite(site.id, { name: "New draft" }, owner));
  await publish(site);
  const draft = await service.getWebsiteById(site.id, owner);
  for (let n=0;n<2;n++) {
    const restored = await publication.publish(site.id, owner, { context: await state(site), restoreId: first.revision.id });
    assert.equal(restored.revision.kind, "RESTORE"); assert.equal(restored.revision.restoredFromRevisionId, first.revision.id);
    assert.equal(restored.name, "Original site");
  }
  const after = await service.getWebsiteById(site.id, owner);
  assert.equal(after.name, draft.name); assert.deepEqual(after.pages, draft.pages);
  assert.deepEqual(await publication.getRevision(site.id, first.revision.id, owner), source);
  const history = await publication.list(site.id, owner);
  assert.equal(history.revisions.length, 4); assert.equal(history.revisions[0].id, history.activeRevisionId);
  await assert.rejects(publication.list(site.id, "other"), { statusCode: 404 });
  await assert.rejects(publication.getRevision(site.id, first.revision.id, "other"), { statusCode: 404 });
  await assert.rejects(publication.getRevision(site.id, "unknown", owner), { statusCode: 404 });
  await assert.rejects(publication.publish(site.id, owner, { context: await state(site), restoreId: "unknown" }), { statusCode: 404 });
});
test("database refuses revision UPDATE/DELETE and cross-website active/restoration relations", async () => {
  const a = await fixture(), b = await fixture(), ra = await publish(a), rb = await publish(b);
  const original = await publication.getRevision(a.id, ra.revision.id, owner);
  await assert.rejects(prisma.websiteRevision.update({ where: { id: ra.revision.id }, data: { actorId: "changed" } }), /immutable/);
  await assert.rejects(prisma.websiteRevision.delete({ where: { id: ra.revision.id } }), /immutable/);
  await assert.rejects(prisma.websitePublicationState.update({ where: { websiteId: a.id }, data: { activeRevisionId: rb.revision.id } }), /Foreign key/);
  await assert.rejects(prisma.websiteRevision.create({ data: { id: crypto.randomUUID(), websiteId: a.id, sequence: 2, snapshot: {}, snapshotHash: "0".repeat(64), actorId: owner, restoredFromRevisionId: rb.revision.id } }), /Foreign key/);
  assert.deepEqual(await publication.getRevision(a.id, ra.revision.id, owner), original);
});
test("legacy cache remains readable; first explicit publish preserves its exact prior snapshot as history", async () => {
  const original = await service.getPublishedWebsiteBySlug("m15-legacy");
  assert.equal(original.publishedData.unknown.preserve, true);
  assert.equal(await prisma.websitePublicationState.count({ where: { websiteId: "legacy-w" } }), 0);
  const site = await fixture({ legacy: true });
  assert.deepEqual((await service.getPublishedWebsiteBySlug(site.slug)).publishedData, site.publishedData);
  const published = await publish(site); assert.equal(published.revision.sequence, 2);
  const history = await publication.list(site.id, owner), imported = history.revisions.find(r=>r.kind==="LEGACY_IMPORT");
  assert.deepEqual((await publication.getRevision(site.id, imported.id, owner)).snapshot, site.publishedData);
  const restored = await publication.publish(site.id, owner, { context: await state(site), restoreId: imported.id });
  assert.equal(restored.name, "Old legacy publication");
});

test("legacy URL edits require explicit publication; ordinary edits never import history",async()=>{
 const site=await fixture({legacy:true}),before=await service.getPublishedWebsiteBySlug(site.slug);
 await run({},()=>service.updateWebsite(site.id,{name:"Draft name"},owner));
 assert.equal(await prisma.websiteRevision.count({where:{websiteId:site.id}}),0);
 await assert.rejects(run(await state(site),()=>service.updateWebsite(site.id,{slug:site.slug+"-draft"},owner)),{statusCode:409,code:"LEGACY_PUBLISH_REQUIRED"});
 assert.deepEqual((await service.getPublishedWebsiteBySlug(site.slug)).publishedData,before.publishedData);
 await publish(site);
 await run(await state(site),()=>service.updateWebsite(site.id,{slug:site.slug+"-draft"},owner));
 assert.equal((await service.getWebsiteById(site.id,owner)).publication.slug,site.slug);
 const list=await service.getUserWebsites(owner);assert.equal(list.data.find(w=>w.id===site.id).publicationState.publishedSlug,site.slug);
});

test("template chrome/theme/page content are copied to website ownership and never propagated into publications",async()=>{
 const id="m3-template-"+crypto.randomBytes(6).toString("hex");
 const layout={header:{enabled:true,logoText:"Template original",links:[]},footer:{enabled:false},unknown:{keep:true}};
 const data=createPageDocument(id+"-doc");data.content=[{type:"Heading",props:{id:"h",text:"Template original content"}}];
 await prisma.template.create({data:{id,name:"Template",category:"Test",status:"PUBLISHED",globalLayout:layout,theme:{colors:{primary:"#123456"}},pages:{create:{id:id+"-page",name:"Home",slug:"home",order:0,editorData:data}}}});
 const site=await service.createWebsiteFromTemplate({templateId:id,name:"Website copy",userId:owner});
 assert.deepEqual((await state(site)).globalLayout,layout);
 const first=await publish(site),before=await service.getPublishedWebsiteBySlug(first.slug);
 await prisma.template.update({where:{id},data:{globalLayout:{header:{enabled:true,logoText:"Template changed"}},theme:{colors:{primary:"#ffffff"}}}});
 assert.deepEqual(await service.getPublishedWebsiteBySlug(first.slug),before);
 const customer={...layout,header:{...layout.header,logoText:"Customer override"}};
 await run(await state(site),()=>publication.setLayout(site.id,owner,customer));
 const second=await publish(site);
 assert.equal((await publication.getRevision(site.id,first.revision.id,owner)).snapshot.globalLayout.header.logoText,"Template original");
 const active=await publication.getRevision(site.id,second.revision.id,owner);
 assert.equal(active.snapshot.globalLayout.header.logoText,"Customer override");
 assert.deepEqual(active.snapshot.theme,{colors:{primary:"#123456"}});
 assert.equal(active.snapshot.pages[0].editorData.content[0].props.text,"Template original content");
});

test("active revision resolution still honors the existing published visibility flag",async()=>{
 const site=await fixture();await publish(site);
 await prisma.website.update({where:{id:site.id},data:{isPublished:false}});
 assert.equal(await service.getPublishedWebsiteBySlug(site.slug),null);
 assert.equal((await publication.list(site.id,owner)).revisions.length,1);
});

test("explicit publication retains legacy reserved-slug repair and advances the changed draft token",async()=>{
 const site=await fixture();await prisma.website.update({where:{id:site.id},data:{slug:"site"}});
 const first=await publish(site);
 assert.notEqual(first.slug,"site");assert.match(first.slug,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
 assert.equal(first.concurrency.draftVersion,1);
 assert.equal((await service.getWebsiteById(site.id,owner)).slug,first.slug);
 const second=await publish(site);assert.equal(second.slug,first.slug);assert.equal(second.concurrency.draftVersion,1);
 await assert.rejects(run({},()=>service.publishWebsite(site.id,owner)),{statusCode:409});
});

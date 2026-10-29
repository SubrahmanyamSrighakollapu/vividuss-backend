const crypto = require("node:crypto");
const prisma = require("../lib/prisma");
const { transactions, requests, enabled, expected, tokens, fail } = require("../lib/publicationContext");
const { hash, clone, validateLayout, buildRevisionSnapshot } = require("../lib/revisionSnapshot");
const include = { pages: { orderBy: { order: "asc" }, include: { sections: { orderBy: { order: "asc" } } } } };
const metadata = { id: true, websiteId: true, sequence: true, createdAt: true, actorId: true, snapshotHash: true, kind: true, restoredFromRevisionId: true };
function requireEnabled() { if (!enabled()) throw fail("Publication revisions are disabled pending schema approval.", 503, "REVISIONS_DISABLED"); }
async function owned(tx, websiteId, userId) {
  const website = await tx.website.findFirst({ where: { id: websiteId, userId } });
  if (!website) throw fail("Website not found or unauthorized", 404, "NOT_FOUND");
  return website;
}
async function resolveWebsite(tx, locator, userId) {
  if (locator.websiteId) { await owned(tx, locator.websiteId, userId); return locator.websiteId; }
  if (locator.pageId) {
    const page = await tx.websitePage.findFirst({ where: { id: locator.pageId, website: { userId } }, select: { websiteId: true } });
    if (page) return page.websiteId;
  }
  if (locator.sectionId) {
    const section = await tx.websiteSection.findFirst({ where: { id: locator.sectionId, page: { website: { userId } } }, select: { page: { select: { websiteId: true } } } });
    if (section) return section.page.websiteId;
  }
  throw fail("Website resource not found or unauthorized", 404, "NOT_FOUND");
}
async function lockState(tx, websiteId, userId) {
  const rows = await tx.$queryRawUnsafe('SELECT "id" FROM "Website" WHERE "id"=$1 AND "userId"=$2 FOR UPDATE', websiteId, userId);
  if (!rows.length) throw fail("Website not found or unauthorized", 404, "NOT_FOUND");
  return tx.websitePublicationState.upsert({ where: { websiteId }, create: { websiteId }, update: {} });
}
function record(state) { const ctx = requests.getStore(); if (ctx) ctx.result = tokens(state); return tokens(state); }
async function mutate(locator, userId, operation, context = requests.getStore()) {
  requireEnabled();
  let committedState;
  const output = await prisma.$transaction(async tx => {
    const websiteId = await resolveWebsite(tx, locator, userId);
    const state = await lockState(tx, websiteId, userId);
    expected(context, state);
    const result = await transactions.run(tx, operation);
    const next = await tx.websitePublicationState.update({ where: { websiteId }, data: { draftVersion: { increment: 1 } } });
    committedState = next;
    return result && !Array.isArray(result) ? { ...result, concurrency: tokens(next) } : result;
  }, { timeout: 15000 });
  record(committedState); return output;
}
async function readDraft(websiteId, userId, operation) {
  requireEnabled();
  return prisma.$transaction(async tx => {
    await owned(tx, websiteId, userId);
    const result = await transactions.run(tx, operation);
    const state = await tx.websitePublicationState.findUnique({ where: { websiteId } });
    return { ...result, concurrency: tokens(state), publication: { slug: state?.publishedSlug || (result.isPublished ? result.slug : null), activeRevisionId: state?.activeRevisionId || null } };
  }, { isolationLevel: "RepeatableRead" });
}
async function getState(websiteId, userId) {
  requireEnabled();
  return prisma.$transaction(async tx => {
    await owned(tx, websiteId, userId);
    const state = await tx.websitePublicationState.findUnique({ where: { websiteId } });
    const activeRevision = state?.activeRevisionId ? await tx.websiteRevision.findFirst({ where: { id: state.activeRevisionId, websiteId }, select: metadata }) : null;
    return { ...tokens(state), activeRevision, globalLayout: state?.globalLayout ?? null };
  }, { isolationLevel: "RepeatableRead" });
}
async function setLayout(websiteId, userId, layout, context) {
  if (layout === undefined) throw fail("globalLayout is required (object or null)", 400, "INVALID_LAYOUT");
  validateLayout(layout);
  return mutate({ websiteId }, userId, () => prisma.websitePublicationState.update({ where: { websiteId }, data: { globalLayout: layout === null ? require("@prisma/client").Prisma.DbNull : layout } }), context);
}
async function publish(websiteId, userId, { context = requests.getStore(), customSlug, restoreId, validateSlug } = {}) {
  requireEnabled();
  let committedState;
  const output = await prisma.$transaction(async tx => {
    const state = await lockState(tx, websiteId, userId);
    expected(context, state, true);
    const website = await tx.website.findFirst({ where: { id: websiteId, userId }, include });
    let source, sourceKind;
    if (restoreId) {
      const original = await tx.websiteRevision.findFirst({ where: { id: restoreId, websiteId } });
      if (!original) throw fail("Revision not found", 404, "NOT_FOUND");
      if (hash(original.snapshot) !== original.snapshotHash) throw fail("Revision integrity check failed", 500, "REVISION_INTEGRITY");
      source = original.snapshot; sourceKind = original.kind;
      // Website routing identity stays stable during restoration. Page routing,
      // name, theme and layout come from the historical snapshot.
      source = { ...source, slug: state.publishedSlug || source.slug || website.slug };
    } else if (customSlug) website.slug = await validateSlug(customSlug, websiteId, tx);
    if (!restoreId) website.slug = await validateSlug(website.slug, websiteId, tx);
    const slug = source?.slug || website.slug;
    const collision = await tx.websitePublicationState.findFirst({ where: { publishedSlug: slug, NOT: { websiteId } } });
    const legacyCollision = await tx.website.findFirst({ where: { slug, isPublished: true, NOT: { id: websiteId } } });
    if (collision || legacyCollision) throw fail("Published slug is already in use", 409, "SLUG_CONFLICT");
    let baseSequence = state.publicationVersion;
    // An explicit first publish preserves the previous legacy cache verbatim as
    // history. Merely enabling/reading never creates records or rewrites JSON.
    if (!baseSequence && website.isPublished && website.publishedData) {
      const legacySnapshot = clone(website.publishedData);
      await tx.websiteRevision.create({ data: { id: crypto.randomUUID(), websiteId, sequence: 1, kind: "LEGACY_IMPORT", actorId: userId, createdAt: website.publishedAt || new Date(), snapshot: legacySnapshot, snapshotHash: hash(legacySnapshot) } });
      baseSequence = 1;
    }
    const event = { id: crypto.randomUUID(), kind: restoreId ? "RESTORE" : "PUBLISH", sequence: baseSequence + 1, createdAt: new Date(), restoredFromRevisionId: restoreId || null };
    const snapshot = buildRevisionSnapshot(website, state, event, source, sourceKind);
    const revision = await tx.websiteRevision.create({ data: { ...event, websiteId, actorId: userId, snapshot, snapshotHash: hash(snapshot) }, select: metadata });
    const next = await tx.websitePublicationState.update({ where: { websiteId }, data: { activeRevisionId: revision.id, publicationVersion: event.sequence, publishedSlug: slug } });
    // Compatibility readers receive the same snapshot, never a separate draft.
    await tx.website.update({ where: { id: websiteId }, data: { isPublished: true, publishedAt: event.createdAt, publishedData: snapshot } });
    committedState = next;
    return { id: websiteId, name: snapshot.name, slug, isPublished: true, publishedAt: event.createdAt, revision, concurrency: tokens(next) };
  }, { timeout: 15000 });
  record(committedState); return output;
}
async function list(websiteId, userId, { before, limit = 25 } = {}) {
  requireEnabled(); await owned(prisma, websiteId, userId);
  if (before !== undefined && (!Number.isSafeInteger(Number(before)) || Number(before) < 1)) throw fail("Invalid revision cursor", 400, "INVALID_CURSOR");
  const take = Math.max(1, Math.min(50, Math.trunc(Number(limit)) || 25));
  const state = await prisma.websitePublicationState.findUnique({ where: { websiteId } });
  const revisions = await prisma.websiteRevision.findMany({ where: { websiteId, ...(before ? { sequence: { lt: Number(before) } } : {}) }, orderBy: { sequence: "desc" }, take, select: metadata });
  return { activeRevisionId: state?.activeRevisionId || null, revisions };
}
async function getRevision(websiteId, revisionId, userId) {
  requireEnabled(); await owned(prisma, websiteId, userId);
  const revision = await prisma.websiteRevision.findFirst({ where: { id: revisionId, websiteId } });
  if (!revision) throw fail("Revision not found", 404, "NOT_FOUND");
  if (hash(revision.snapshot) !== revision.snapshotHash) throw fail("Revision integrity check failed", 500, "REVISION_INTEGRITY");
  return revision;
}
async function publicWebsite(slug, legacyReader) {
  if (!enabled()) return legacyReader(slug);
  if (typeof slug !== "string") return null;
  const normalized = slug.toLowerCase().trim();
  const state = await prisma.websitePublicationState.findUnique({ where: { publishedSlug: normalized }, include: { activeRevision: true, website: { select: { isPublished: true } } } });
  if (state?.activeRevision) {
    if (!state.website.isPublished) return null;
    const revision = state.activeRevision;
    if (revision.websiteId !== state.websiteId || hash(revision.snapshot) !== revision.snapshotHash) throw fail("Publication integrity failure", 500, "REVISION_INTEGRITY");
    const snapshot = clone(revision.snapshot);
    return { id: state.websiteId, name: snapshot.name, slug: snapshot.slug, isPublished: true,
      publishedAt: revision.createdAt, publishedData: snapshot,
      publication: { revisionId: revision.id, sequence: revision.sequence } };
  }
  const legacy = await legacyReader(slug);
  if (!legacy) return null;
  const active = await prisma.websitePublicationState.findUnique({ where: { websiteId: legacy.id } });
  return active?.activeRevisionId ? null : legacy;
}
async function assertSchemaReady() {
  if (!enabled()) return;
  if (!prisma.websiteRevision || !prisma.websitePublicationState) throw new Error("Revision rollout refused: regenerate the approved Prisma client");
  const [result] = await prisma.$queryRawUnsafe(`SELECT to_regclass('public."WebsiteRevision"') IS NOT NULL AND to_regclass('public."WebsitePublicationState"') IS NOT NULL
    AND EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='vividuss_revision_immutable' AND tgrelid=to_regclass('public."WebsiteRevision"') AND NOT tgisinternal)
    AND EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='vividuss_revision_no_truncate' AND tgrelid=to_regclass('public."WebsiteRevision"') AND NOT tgisinternal)
    AND EXISTS (SELECT 1 FROM pg_constraint WHERE conname='publication_pointer_consistent' AND conrelid=to_regclass('public."WebsitePublicationState"')) AS ready`);
  if (!result?.ready) throw new Error("Revision rollout refused: approved publication schema/immutability guards are missing");
  await prisma.$queryRawUnsafe('SELECT "id","websiteId","sequence","kind","snapshot","snapshotHash","actorId","createdAt","restoredFromRevisionId" FROM "WebsiteRevision" WHERE false');
  await prisma.$queryRawUnsafe('SELECT "websiteId","draftVersion","publicationVersion","activeRevisionId","publishedSlug","globalLayout","updatedAt" FROM "WebsitePublicationState" WHERE false');
}

module.exports = { mutate, readDraft, getState, setLayout, publish, list, getRevision, publicWebsite, assertSchemaReady, resolveWebsite, lockState, metadata };

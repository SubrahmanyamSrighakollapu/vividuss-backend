const crypto = require("node:crypto");
const { buildPublicationSnapshot } = require("./publicationSnapshot");
const { validateEditorDocument } = require("./documentValidation");
const { safeUrl } = require("../../shared/website-contract/index.cjs");
const { fail } = require("./publicationContext");
const clone = value => JSON.parse(JSON.stringify(value));
function canonical(value) {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object") return "{" + Object.keys(value).sort().map(k => JSON.stringify(k) + ":" + canonical(value[k])).join(",") + "}";
  return JSON.stringify(value);
}
const hash = value => crypto.createHash("sha256").update(canonical(value)).digest("hex");
function validateLayout(layout) {
  if (layout == null) return;
  if (typeof layout !== "object" || Array.isArray(layout) || Buffer.byteLength(JSON.stringify(layout)) > 100000) throw fail("Invalid website layout", 400, "INVALID_LAYOUT");
  for (const part of ["header", "footer"]) {
    const value = layout[part];
    if (value === undefined) continue;
    if (!value || typeof value !== "object" || Array.isArray(value) || value.enabled !== undefined && typeof value.enabled !== "boolean") throw fail("Invalid layout " + part, 400, "INVALID_LAYOUT");
    for (const key of ["logoText", "copyrightText", "logoUrl", "backgroundColor", "textColor"]) {
      if (value[key] !== undefined && typeof value[key] !== "string") throw fail("Invalid layout " + key, 400, "INVALID_LAYOUT");
    }
    if (value.logoUrl && !safeUrl(value.logoUrl)) throw fail("Unsafe layout logo URL", 400, "INVALID_LAYOUT");
    if (value.links !== undefined && (!Array.isArray(value.links) || value.links.some(link => !link || typeof link.label !== "string" || typeof link.href !== "string" || !safeUrl(link.href)))) throw fail("Invalid layout links", 400, "INVALID_LAYOUT");
  }
}
function validateSnapshot(snapshot, websiteId) {
  if (!snapshot || typeof snapshot !== "object" || !Array.isArray(snapshot.pages) || !snapshot.pages.length ||
      snapshot.websiteId !== undefined && snapshot.websiteId !== websiteId ||
      snapshot.format !== undefined && snapshot.format !== "vividuss.website.snapshot" ||
      snapshot.schemaVersion !== undefined && snapshot.schemaVersion !== 1 ||
      snapshot.registryVersion !== undefined && snapshot.registryVersion !== 1) throw fail("Unsupported publication snapshot", 400, "INVALID_SNAPSHOT");
  const ids = new Set(), slugs = new Set();
  for (const page of snapshot.pages) {
    if (typeof page.id !== "string" || ids.has(page.id) || typeof page.slug !== "string" ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(page.slug) || slugs.has(page.slug)) throw fail("Invalid or duplicate published page identity/slug", 400, "INVALID_SNAPSHOT");
    ids.add(page.id); slugs.add(page.slug);
    if (page.editorData != null) validateEditorDocument(page.editorData);
    else if (page.sections !== undefined && !Array.isArray(page.sections)) throw fail("Invalid legacy sections", 400, "INVALID_SNAPSHOT");
  }
  validateLayout(snapshot.globalLayout);
  if (Buffer.byteLength(JSON.stringify(snapshot)) > 8000000) throw fail("Publication exceeds 8 MB", 413, "PUBLICATION_TOO_LARGE");
  return snapshot;
}
function buildRevisionSnapshot(website, state, event, source, sourceKind) {
  const snapshot = source ? clone(source) : buildPublicationSnapshot(website, website.slug);
  if (!source) snapshot.globalLayout = state.globalLayout == null ? null : clone(state.globalLayout);
  if (!source) snapshot.layoutPolicy = "website-owned-v1";
  else if (sourceKind === "LEGACY_IMPORT") snapshot.layoutPolicy = "legacy-output";
  snapshot.websiteId = website.id;
  snapshot.publication = { revisionId: event.id, sequence: event.sequence, publishedAt: event.createdAt.toISOString(),
    restoredFromRevisionId: event.restoredFromRevisionId || null };
  snapshot.externalReferencePolicy = "Stored URLs are frozen; remote media bytes and third-party embeds remain externally resolved.";
  return validateSnapshot(snapshot, website.id);
}
module.exports = { clone, canonical, hash, validateLayout, validateSnapshot, buildRevisionSnapshot };

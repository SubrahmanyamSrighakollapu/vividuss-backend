const MAX_EDITOR_DOCUMENT_BYTES = 1_000_000;
// The editor also sends root responsive settings as a separate field. Allow a
// full document plus that duplicate and envelope overhead, with a finite bound.
const EDITOR_REQUEST_BYTES = 2_100_000;
const DRAFT_REQUEST_BYTES = 8_000_000;
const { inspectDocument, FORMAT } = require("../../shared/website-contract/index.cjs");

function assertDocumentReplacement(previous, document) {
  if (previous?.format === FORMAT && (document.format !== FORMAT || document.documentId !== previous.documentId)) {
    throw Object.assign(new Error("Canonical documents cannot be downgraded or change identity"), {
      statusCode: 400, code: "DOCUMENT_VALIDATION_FAILED",
      details: [{ path: "$.documentId", code: "DOCUMENT_IDENTITY", reason: "Preserve the stored canonical identity and format" }],
    });
  }
}

function validateEditorDocument(document) {
  if (!document || typeof document !== "object" || Array.isArray(document) ||
      !Array.isArray(document.content) || !document.root ||
      typeof document.root !== "object" || Array.isArray(document.root)) {
    throw Object.assign(new Error("Invalid Puck editor document"), { statusCode: 400 });
  }
  let serialized;
  try { serialized = JSON.stringify(document); } catch {
    throw Object.assign(new Error("Editor document must be valid JSON"), { statusCode: 400 });
  }
  if (Buffer.byteLength(serialized, "utf8") > MAX_EDITOR_DOCUMENT_BYTES) {
    throw Object.assign(new Error("Editor document exceeds the 1 MB limit"), { statusCode: 413 });
  }
  const report = inspectDocument(document);
  if (report.errors.length) {
    throw Object.assign(new Error("Website document validation failed"), {
      statusCode: 400, code: "DOCUMENT_VALIDATION_FAILED", details: report.errors,
    });
  }
  return document;
}
function assertPuckEditable(page) {
  const sections = page._count?.sections ?? page.sections?.length ?? 0;
  if (sections > 0 && page.editorData == null) {
    throw Object.assign(new Error("Legacy sections require verified migration before Puck editing"), { statusCode: 409 });
  }
}
module.exports = { MAX_EDITOR_DOCUMENT_BYTES, EDITOR_REQUEST_BYTES, DRAFT_REQUEST_BYTES, validateEditorDocument, assertPuckEditable, assertDocumentReplacement };

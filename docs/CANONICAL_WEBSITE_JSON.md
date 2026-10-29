# Canonical website JSON v1

Implementation: [shared contract](../shared/website-contract/index.cjs), [envelope schema](../shared/website-contract/page.schema.json), [component contracts](../shared/website-contract/component-contracts.json). The JSON Schema describes interchange structure; it is not sufficient alone for saving/publishing. `inspectDocument` plus backend `validateEditorDocument` enforce the registry and bounds.

## Editable page document

The v1 envelope deliberately extends Puck's root/content semantics rather than wrapping/replacing its tree:

```json
{
  "format": "vividuss.puck.page",
  "schemaVersion": 1,
  "registryVersion": 1,
  "documentId": "stable-document-id",
  "metadata": {"title": "Published page title", "description": "Page description"},
  "root": {"props": {"title": "Page", "responsive": {"mobile": {"paddingX": "16px"}}}},
  "content": [{"type": "Section", "props": {"id": "section-1", "content": [
    {"type": "Heading", "props": {"id": "heading-1", "text": "Welcome", "level": "h1", "responsive": {"tablet": {"fontSize": 32}, "mobile": {"fontSize": 24}}}}
  ]}}]
}
```

`documentId` is document identity independent of the Prisma page row ID. New server-authored pages/templates receive a UUID; blank previously-null nonlegacy pages can use their row ID when explicitly saved. Explicit duplication gives canonical copies a new document identity; original records and unversioned copies keep their content/format. Component IDs are stable per document and unique across top-level content, nested slots and old Puck zones. Puck's optional `zones` object remains supported. Slot values are arrays, not JSX/functions/serialized source. The current definitions impose no restricted child lists.

New pages created by website.service.js/createWebsitePage and template.service.js/createPage/createTemplate are canonical. Existing template copies remain in their existing format; canonical template copies fork identity. No read adapter writes version metadata into stored historical JSON. The older secondary createTemplate helper in website.service.js also creates a canonical blank document.

Panel fields are optional because current views have omission/default behavior; only node type/props/id and canonical envelope/identity/root.props/content are required. Fields, enum/range options, defaults, media fields, responsive settings and slot paths come from actual registries. Exact shipped defaults that predate current panel ranges/options remain accepted. Default-only historical props can be inferred from the registered defaults. New arbitrary component props are rejected in strict mode. Top-level opaque historical extensions remain inert and are preserved; they cannot introduce rendering code.

Responsive settings retain `desktop`, `tablet`, `mobile`. Desktop base props remain meaningful, and overrides follow the existing desktop → tablet → mobile inheritance in responsiveStyles.js. Viewport media queries, preview classes and container queries retain existing 1024/768 boundaries. Numeric CSS lengths keep their existing px conversion; unitless keys keep their existing semantics. Contract fields can be numbers, enums, text, colors, URLs, objects, arrays, slots or responsive objects.

Optional metadata supports title, description, canonicalUrl and noIndex. Routes use only published copies for SEO. `themeRef` and `globalLayoutRef` are optional string references reserved for future versioned resolution, not implemented theme/layout fetch services. Current website rendering still uses the theme already captured in publishedData. Template globalLayout is template-scoped and not implicitly copied to customers; reusable Navbar/Footer/Hero slots are regular page components. No live template default can override a customer publication through these references.

## Website publication snapshot

`backend/src/lib/publicationSnapshot.js::buildPublicationSnapshot` produces:

```json
{
  "format": "vividuss.website.snapshot", "schemaVersion": 1, "registryVersion": 1,
  "websiteId": "website-row-id", "name": "Site", "slug": "site-slug", "theme": null,
  "pages": [{"id": "page-row-id", "name": "Home", "slug": "home", "order": 0,
    "editorData": {"format": "vividuss.puck.page", "schemaVersion": 1, "registryVersion": 1,
      "documentId": "page-document-id", "root": {"props": {}}, "content": []},
    "responsive": null, "sections": []}]
}
```

Snapshots may mix canonical pages, unversioned Puck documents and legacy sections. Old snapshots without format/registry metadata remain readable. Snapshot construction deep-copies data; publication persists only previously saved content after validation, inside the existing transaction. Saving a draft does not change publishedData. This field remains replaceable on explicit publication; immutable revisions/rollback are not enabled. The existing explicit URL-change path can update the published slug; it is not a revision API.

## Validation and compatibility rollout

- `detectDocumentFormat`: null editorData → legacy; root/content without version metadata → unversioned Puck; supported explicit metadata → canonical; other explicit versions/formats or malformed documents → unsupported.
- Historical mode reports type/prop/URL/style differences without deleting or changing data. `node backend/scripts/inspect-document.js <export.json>` is a read-only report command. Fixtures are representative repository fixtures, not an inventory of customer databases.
- New canonical mode rejects unknown types/props, malformed slots, invalid IDs/types/enums/ranges/responsive values, unsafe registered URLs/colors/CSS strings, and unsupported versions. Existing canonical records cannot be downgraded or change identity through save APIs.
- Hard bounds apply at persistence: 1,000,000 UTF-8 bytes/page, 2,000 components, component depth 32, raw JSON depth 64/nodes 50,000; traversal stops safely. Existing HTTP limits remain 2,100,000 bytes ordinary / 8,000,000 bytes draft. Raw JSON nesting may reach its limit before component depth. No truncation.
- Errors preserve response success/message and add `code: DOCUMENT_VALIDATION_FAILED`, `errors: [{path, code, reason}]`. Editor shows the first three actionable paths. JSON/size/ownership errors retain existing statuses.
- Saves, multi-page drafts, website publish and template publish use the same validation helper. Explicit responsive overrides are revalidated after merging. Template/global-layout JSON remains its existing separate contract.
- Text/code snippets are React text, not executable HTML. Registered URLs exclude javascript/data/protocol-relative URLs, credentials, control characters and attribute delimiters. String CSS injection is rejected on canonical paths. This is a local safety contract, not network allowlisting or a complete historical-content sanitizer.

Unversioned compatibility mode deliberately does not claim to sanitize all historical content. Review warnings before migrating trusted legacy documents. No automatic conversion, bulk rewrite, empty replacement of section pages or runtime extension loader is provided. Puck envelope retention restores unknown historical root/node fields by stable component ID when editing; explicit API replacements remain caller-submitted data. Unknown metadata inside reordered array items still needs customer-fixture/browser verification.

## Version policy and future AI

`schemaVersion` owns envelope semantics; `registryVersion` owns the complete component contract set; each component contract has version 1. Changing meaning/removing props/types needs an explicit registry/schema compatibility version and tested reader adapter. Puck node shape is unchanged; component versions are registry-managed rather than adding an incompatible mandatory prop. Unsupported future versions never silently downgrade. Keep old readers/views until preserved exports and rendering evidence permit retirement.

AI may generate/propose this bounded JSON or structured edits to it. It must use actual registry/default/slot metadata, retain document/node identity, run backend validation, and obtain an authorized explicit apply action. Optimistic concurrency, proposal storage, undo/history, recipe resolution and organization entitlements are later requirements. These contracts prepare that boundary; they are not an AI implementation.

## Milestone 3 publication update

Page format/schema/registry contracts and all 57 registrations remain unchanged. New immutable WebsiteRevision snapshots add publication identity/provenance, external reference policy and explicit website-owned chrome policy around the same page JSON. publishedData remains a compatibility cache of the selected snapshot; immutable history lives separately. Restore creates a new snapshot/event without overwriting old revisions or current drafts. Legacy copy-on-explicit-publish is exact preservation, not a section/Puck conversion or automatic version upgrade.

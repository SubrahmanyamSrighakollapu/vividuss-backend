# Publication integrity: Milestone 3

Status: implemented on development branches and verified in disposable PostgreSQL; **disabled by default, not live**. This document applies to both standalone repositories. Paths below are qualified by repository where necessary.

## Storage and ownership

The backend Prisma schema adds only two tables and relation declarations; it adds no scalar columns to existing Website/WebsitePage tables. This matters because disabled-mode Prisma queries must still work before the additive revision schema is installed.

| Model/field | Ownership and meaning |
|---|---|
| WebsitePublicationState.websiteId | One-to-one website FK; all access derives ownership from Website.userId |
| draftVersion | Whole-website saved draft counter covering page/section/metadata/layout mutations |
| publicationVersion | Successful event sequence; also the last revision sequence |
| activeRevisionId | Mutable active pointer; composite FK to (websiteId,id) prevents cross-site selection |
| publishedSlug | Independently reserved active public path; draft Website.slug does not replace it |
| globalLayout | Website-owned draft chrome; null for existing sites until explicitly saved |
| WebsiteRevision.id/websiteId/sequence | Immutable revision identity, website FK, unique per-site sequence |
| snapshot/snapshotHash | Complete JSON plus deterministic SHA-256; hash checks detect inconsistent reads |
| actorId | Trusted authenticated publisher/restorer; for LEGACY_IMPORT this identifies the importer, not a claimed original publisher |
| createdAt | Publication timestamp; a legacy import preserves the known previous publishedAt if available |
| kind | PUBLISH, RESTORE, LEGACY_IMPORT |
| restoredFromRevisionId | Immutable provenance with same-website composite FK |

Database triggers reject revision UPDATE, DELETE and TRUNCATE. History deletion/retention has no API or approved policy. Website deletion is restricted by history/state FKs. Privileged database administrators can alter database protections; production must use an appropriately restricted application role and reviewed operational controls.

## Atomic operation

Backend implementation: src/services/publication.service.js::publish, src/lib/revisionSnapshot.js::buildRevisionSnapshot, src/services/publicationAdapter.js::attachPublicationIntegrity.

1. Require rollout and authenticated website ownership.
2. Lock the owned Website row FOR UPDATE, then initialize/load publication state within the same transaction.
3. Check expected draft and publication versions.
4. Load saved pages/sections and draft metadata/theme; validate document versions, props, slots, routing identity, layout and bounds.
5. If this is the first **explicit publish** of a legacy publication, copy the previous publishedData verbatim into a LEGACY_IMPORT revision. Enabling, opening, reading or ordinary editing never imports history.
6. Build a complete immutable snapshot, create a new event and advance the active pointer/publication counter/reserved slug.
7. Update publishedData/publishedAt/isPublished as a compatibility cache of the exact same selected snapshot.
8. Commit; only then acknowledge the resulting concurrency tokens.

Any failure rolls back inserted history, state initialization, pointer, counters and compatibility cache together. Same-site writers serialize on the website row, so competing publishers using the same tokens have one winner and one 409. A repeated request with old tokens cannot create another event; there is no automatic blind retry or separate durable idempotency-key store.

## Snapshot resolution

Snapshots include site ID/name/slug, page IDs/order/slugs/names, complete canonical or historical editorData and responsive values, legacy sections/configuration, saved theme and website-owned globalLayout. They also carry format/schema/registry metadata, publication event identity/time and restoration provenance. Page SEO metadata stays inside the frozen page documents.

Existing Puck Navbar/Footer props remain page-owned and unchanged. New site creation while enabled copies supported template globalLayout/theme/page data into website ownership; later template edits never propagate. Existing sites do not acquire template chrome simply by enabling this feature. Owner controls can explicitly save supported header/footer fields; unknown existing fields survive edits. The last saved layout is used on publish.

New website-owned chrome has layoutPolicy=website-owned-v1 and a publication marker. The public shell renders additional chrome only under that explicit policy. Historical globalLayout fields that were previously inert stay inert; restoring LEGACY_IMPORT uses legacy-output policy and does not retroactively activate them. Original imported JSON remains unchanged.

Remote media strings and third-party embeds are frozen as references, **not as remote bytes**. snapshot.externalReferencePolicy records that resolution rule. No asset downloads, media duplication, extension resource resolver or claim of immutable third-party content is introduced. Future versioned assets/business resources need separate contracts.

## Revision history and restoration

Owner-scoped list/retrieve endpoints expose immutable metadata/snapshot inspection and the active revision ID. List is bounded to 50 entries with a sequence cursor. Unknown or foreign-site revisions return 404.

Restore validates the selected snapshot and creates a new RESTORE revision referencing the original ID. It restores published page routing/order/content/SEO, name/theme/chrome, while preserving the currently active website URL. Draft rows and draftVersion remain unchanged. Repeated restore is a new explicit event each time. To edit historical content, a future separately approved restore-to-draft operation would be needed; this milestone does not overwrite current drafts.

Legacy snapshots without format/registry/publication tags remain readable. On the first explicit publish, an already-live site's old cache becomes sequence 1 and the newly published draft becomes sequence 2. An unpublished site's first publication is sequence 1. No background backfill or silent JSON conversion exists. Legacy snapshots too malformed for safe restoration remain inspectable but can be rejected by restore validation.

## Optimistic concurrency

A website-level token conservatively covers all website/page/section writes. Missing tokens return 428 VERSION_REQUIRED; stale tokens return 409 VERSION_CONFLICT. Error bodies include current versions for explanation, not permission to auto-rebase local edits.

src/services/publicationAdapter.js wraps the existing twelve mutation entry points: updateWebsite; create/update/delete page; page editor save; duplicate/reorder pages; create/update/delete/reorder legacy sections; whole-draft save. Website creation is a new-resource operation. Template administration and media operations are not claimed to have new concurrency controls.

src/lib/prisma.js uses a narrowly scoped AsyncLocalStorage transaction binding so established helpers operate in the outer optimistic transaction; nested helper transactions do not commit separately. Outside that context, including all disabled-mode requests, Prisma behaves normally. Draft reads use RepeatableRead so the returned JSON and token refer to the same saved state.

A legacy published site's draft URL edit returns 409 LEGACY_PUBLISH_REQUIRED until an explicit publish establishes history. This preserves its existing live URL without automatic history creation on edit. Other legacy draft edits can proceed with normal version checks.

## Public runtime and frontend

Enabled public resolution uses publication state -> immutable revision, verifies the snapshot hash, and returns publishedData in the existing response shape. Unadopted legacy publications retain the previous reader. Draft URL lookups cannot expose an active revision under the wrong slug. No hostname/custom-domain routing is introduced.

Both slug routes use the same snapshot/page helpers. React cache memoizes the published fetch within a server render to reduce metadata/page disagreement; no CDN cache policy is added. Dashboard/editor live links use the published identity/pages instead of mutable draft routing.

Frontend Builder/PuckEditorClient share acknowledged tokens, retain save-before-publish queues and distinguish conflicts/validation/request failures. Server action helpers forward tokens and preserve structured errors. History offers confirmation, active identity, timestamps, inspection and restore. Inspection is safe text/JSON, not an unrestricted live historical iframe.

Conflicts never adopt the server's newer token automatically or replace local edits. Users can download exact local page JSON and unsaved layout data, then explicitly reload. State/history refresh does not overwrite unsaved layout form changes. Reload/reapply is manual; no automatic merge, online collaboration or automatic conflict resolution is claimed.

# Milestone 3 implementation and verification report

29 October 2026. Work is in the two standalone repositories under Vividuss, each on implementation/milestone-3. Backend baseline: 4ca42ad; frontend baseline: 3f02481. Both working trees were clean at the start. Implementation is local and gated; no production deployment or existing-environment database change occurred.

## 1. Implemented features and disposition

Milestone 3 development work implements immutable publication records, atomic publish/restore, owner-scoped history, stale-write detection, published metadata/theme/layout isolation and frontend management/recovery. The enabled storage path was exercised on verified disposable PostgreSQL. **It is not live: VIVIDUSS_PUBLICATION_REVISIONS remains disabled by default until separate migration and production gates pass.**

The 57 registered Puck types, 55 shared views, thirteen legacy sections, canonical page contracts, editor queues and one generic Next.js renderer remain preserved. No customer projects/source generation, hostname/TLS automation, AI, billing, marketplace or unrelated modules were introduced.

## 2. Files changed and responsibilities

Backend repository:

- prisma/schema.prisma: WebsitePublicationState/WebsiteRevision and Website relation declarations.
- docs/migration-proposals/002_publication_revisions.sql: additive tables/indexes/FKs/counter-pointer constraints and immutable-history triggers; outside auto-deployment.
- src/lib/publicationContext.js: enabled, expected, tokens, requestContext; explicit rollout, request versions and transaction/request contexts.
- src/lib/prisma.js: narrow transaction binding for existing helpers; no revision-table access in default mode.
- src/lib/revisionSnapshot.js: validateLayout, validateSnapshot, buildRevisionSnapshot, canonical/hash; bounded publication, exact-copy restoration and content hashing.
- src/services/publication.service.js: mutate, readDraft, getState, setLayout, publish, list, getRevision, publicWebsite, assertSchemaReady.
- src/services/publicationAdapter.js::attachPublicationIntegrity: wraps existing website/page/section writes without rewriting their implementation or enabling new schema by default.
- src/services/website.service.js: attaches the adapter, gates old live-slug cache mutation, selects published routing state only when enabled.
- src/controllers/publication.controller.js; src/controllers/website.controller.js; src/routes/website.route.js: history/state/restore/layout APIs, unchanged auth authority, structured errors/revision response.
- src/config/environment.js, src/server.js, .env.example: strict flag values, disabled default, schema readiness before enabled startup.
- scripts/run-integration.js: verified target binding, disabled default workers and fixed --legacy-only selection.
- scripts/verify-legacy-subset.js: read-only original-row preservation plus provenance checks on additional disposable fixtures.
- tests/publication.test.js, tests/integration/revision-http.test.js, tests/integration/revisions.test.js: pure/helper, HTTP and actual database regressions.

Frontend repository:

- lib/publication-client.mjs: createConcurrencySession, publicationError, downloadLocalDraft, publishedWebsiteIdentity.
- components/website-builder/PuckEditorClient.jsx: expected versions, success-only token acknowledgements, distinct failures, preserved local JSON and manual recovery/download.
- components/builder/Builder.jsx: shared version state, save-before-publish confirmation, published-only live links, history integration and draft URL messaging.
- components/builder/PublicationPanel.jsx: active revision/history, metadata/page inspection, safe advanced JSON inspection, confirmed restore and website header/footer controls. Unsaved layout changes remain local and downloadable.
- components/website-builder/SiteChrome.jsx and PublishedPage.jsx: explicitly revision-scoped additional chrome; historical inert fields stay inert.
- components/WebsiteCard.jsx: published identity instead of draft URL for live links.
- lib/fetch-published-website.js: per-server-render React cache for one snapshot choice across metadata/page calls.
- app/builder/actions.js: preserves existing named action APIs while forwarding tokens and structured failures; batch legacy section actions are sequential acknowledgements, not falsely atomic.
- tests/publication-client.test.mjs; existing architecture/rendering tests: actual client helpers, legacy chrome isolation, published links and Chrome recovery downloads.

Both repositories update AGENTS/README and architecture, requirements, module plan, roadmap, migration/local verification documents. New PUBLICATION_REVISIONS.md, PUBLICATION_API.md, MILESTONE_3_ROLLOUT.md and evidence/milestone-3 document the resulting code and verification.

## 3. Database models and migration artifacts

WebsitePublicationState owns per-website draftVersion/publicationVersion, activeRevisionId, separately reserved publishedSlug, website-owned draft globalLayout and updatedAt. WebsiteRevision owns immutable id/site/sequence/snapshot/hash/kind/actor/time/restoration provenance.

Composite FKs prevent selecting/restoring another site's revision. Per-site sequences are unique; state counters are nonnegative and active pointer/version/slug nullability is checked. Revision triggers reject UPDATE/DELETE/TRUNCATE. No history deletion/retention API was added; new FKs intentionally restrict website deletion until an approved policy exists.

No scalar columns were added to existing tables. The new generated client/default-off code passed the eight original integration tests against the exact M2 baseline **before revision tables existed**. Enabled startup fails closed on missing generated models, required fields and database guards.

Migration order is explicit: original three migrations -> held baseline 001 -> held additive 002. Historical migrations and 001 are unchanged. Neither proposal was promoted into prisma/migrations. The original three-entry ledger remained intact; manually rehearsed proposals were not falsely marked deployed. Committed migrate deploy alone still cannot produce the full current schema.

## 4. Revision and rollback behavior

publication.service.js::publish locks the owned Website row, checks expected state, loads saved pages, validates all relevant documents and builds one complete snapshot. Revision insertion, active pointer/counter/reserved slug and publishedData compatibility cache updates commit together. Failed publication leaves the previous active snapshot intact, including failure after a revision was tentatively inserted.

An unpublished site's first publish is sequence 1. On the first explicit publish of a previously live legacy site, its prior publishedData is copied verbatim as LEGACY_IMPORT sequence 1; the new draft publication is sequence 2. Enabling, viewing, opening or ordinary editing never imports history. LEGACY_IMPORT actor means importer; createdAt preserves known prior publication time, not a claim of knowing the old publisher.

Restore checks ownership/hash/compatibility and creates a new RESTORE event referencing the original revision. It restores published page content/order/routing, SEO, name, theme and supported layout, while keeping the currently active website URL. It does not overwrite current draft rows. Repeated restore creates new events; original revision JSON/provenance stays unchanged.

Snapshots freeze saved values and URL references, not externally served media bytes/embeds. The explicit externalReferencePolicy explains current remote resolution. No asset download or business-resource version resolver was implemented.

## 5. Concurrency behavior

Whole-website counters conservatively cover page editor saves, whole-draft saves, website metadata/theme/URL, page create/update/delete/duplicate/reorder, legacy section create/update/delete/reorder and website-owned layout edits.

Loaded/acknowledged versions are sent with If-Match: "draft-N"; publish/restore also require If-Publication-Match: "publication-N". Missing/malformed tokens return 428 VERSION_REQUIRED; stale requests return 409 VERSION_CONFLICT with current tokens. Successful acknowledgements are recorded only after transaction commit.

All relevant writers lock the same owned Website row before mutating. Existing nested service helpers share that transaction rather than independently committing. RepeatableRead draft responses keep JSON and version coherent. Competing save/publish sessions have one winner; stale/repeated requests cannot silently overwrite or duplicate publication events.

A legacy live draft URL edit is blocked with LEGACY_PUBLISH_REQUIRED until an explicit publish establishes history. This avoids the rejected automatic-import-on-edit alternative. Other edits remain allowed with expected versions and do not create revisions.

Existing explicit-publish repair of reserved/generic slugs is preserved. A custom URL or generated repair is saved atomically and increments draftVersion when it changes the draft URL; subsequent unchanged-URL publishes do not change draftVersion. Restoration never changes draft URL state.

There is no automatic rebase/merge or real-time collaboration. Mixing old/default-off and enabled writers against the same sites is unsafe and prohibited by the rollout plan.

## 6. Public rendering and metadata isolation

Enabled publicWebsite resolves publishedSlug -> active immutable revision and verifies its hash; the existing isPublished visibility flag is still honored. It returns the existing publishedData-compatible shape, plus selected revision identity. Unadopted legacy snapshots use the previous cache reader.

Draft site/page name/slug/SEO/theme/layout changes do not replace the active snapshot. Draft-only URLs do not become live. Current frontend helpers choose snapshot/published routing identity, including dashboard/share links. Home and subpages continue through the same page resolver/public runtime, with per-render fetch memoization.

New website creation while enabled copies supported template layout/theme/pages into website ownership. Later template changes do not propagate; explicit customer overrides remain site-owned and frozen on publication. Existing sites do not silently acquire template defaults.

Additional SiteChrome requires publication identity plus website-owned-v1 layout policy. Restoring a legacy import retains legacy-output behavior, so an old unknown globalLayout field cannot suddenly add a visible header/footer. Page-level Puck Navbar/Footer and all legacy sections stay unchanged.

No hostname/custom-domain resolver or CDN invalidation policy was implemented. External URL bytes and full browser hydration still require later verification/design.

## 7. Frontend changes

Builder and Puck keep awaitable save/flush-before-publish and existing page transition protection. Publishing asks for confirmation when the revision capability is enabled. The publication panel shows the active ID, sequence/time/kind/provenance, refreshable history and safe owner-only inspection. Restore requires confirmation and creates a new publication; current drafts are retained.

Header/footer form controls edit website-owned draft layout and preserve unknown stored fields. Changes are not silently published. State/history refresh does not overwrite unsaved layout changes.

Stale saves keep local editor content and old expected tokens. Users can download exact local page JSON and local layout changes, then deliberately reload/reapply. Validation, version conflicts and ordinary errors have separate client classifications. No background retry adopts a fresh server token.

Normal server-action APIs also forward expected versions and preserve structured errors. Coarse tokens can conflict on unrelated page edits; this is intentional conservative safety, not a collaboration system.

## 8. Test commands and actual results

Commands are run from the relevant standalone repository root.

| Command/check | Actual result |
|---|---|
| Backend npm run build | PASS; Prisma Client 6.19.0 generation only |
| Backend npm run check | PASS; 50 JavaScript files |
| Backend npm test | 37 passed, 0 failed; DB-independent |
| Frontend npm test | 24 passed, 0 failed |
| Frontend npm run lint | 0 errors, 41 no-img-element warnings |
| Frontend npm run build | PASS; Next.js 16.3.5 production build |
| Backend npm run test:integration with guarded disposable URLs | 25 passed, 0 failed |
| Backend npm run test:integration -- --legacy-only | 8 passed, 0 failed; default-off selection |
| Original suite before revision schema | 8 passed against the M2 baseline |
| Frontend npm run test:render | 6 passed, 0 failed |
| Prisma structural comparisons | No difference against M2 before 002; no difference against resulting schema after 002 |
| Shared contract comparison | All five shared files byte-identical across repositories |
| Git whitespace checks | PASS with Windows CR-at-EOL handling |

Forty image warnings were retained from M2; the additional native logo image in SiteChrome follows the existing arbitrary-media URL behavior and remains an optimization follow-up. No lint errors/rules were suppressed and no dependency versions were upgraded.

Actual PostgreSQL cases cover first/multiple/multi-page publish, invalid second page, transaction failure injection after revision insertion, same-page two-tab conflicts, simultaneous publishers, all twelve stale mutation entry points, metadata/layout/theme isolation, owner/unknown revision access, repeated restore, legacy cache import/URL protection, template-copy isolation, published visibility and reserved-slug compatibility. DB UPDATE/DELETE immutability and cross-website FKs are exercised directly on test fixtures.

The actual HTTP-controller integration uses test-only identity doubles inside its fixture server; production continues using Clerk. It verifies 401/404/428/409, structured tokens and publish/history/restore response shapes with real PostgreSQL.

The six Chrome cases are three-width shared-render pixel/CSS comparisons plus exact unsaved-JSON download checks. They use real helpers/views in an isolated harness, no authenticated app routes, no backend bypass. They do not prove signed-in Puck/history/restore interactions, hydration or provider transfers. The credential-gated app suite was not relabelled as passed.

New tests caught a layout aliasing issue; snapshots now deep-copy layout. The recovery harness initially attempted to transpile ESM with a trusted JSX loader; it now imports the actual ESM helper directly and all download checks pass. No failures were hidden through skips.

## 9. Data preservation and database safety

First rehearsal: vividuss-m3-disposable-3f72, ID e5fda4a49b531219408bf35477d3379a0b406bf50572d2dee3f8a3722771f1fa, label milestone-3, loopback 62765, database vividuss_disposable_m15_mthree.

Fresh final regression: vividuss-m3-final-42a8, ID a0a0e9b6197b868a1fbe56f8d08829d592225a41c5a255894d058b5157cc87a5, label milestone-3-final, loopback 61841, database vividuss_disposable_m15_mthreefinal.

Both used PostgreSQL 16.15, role vividuss_test, verified empty identity, explicit matching disposable/service URLs, existing narrow server marker, tmpfs and no host mounts. Ordered replay/proposals ran only there. Existing databases/containers/volumes were untouched.

Original six representative table rows retained IDs, relationships, ownership and canonical JSON/original-column hashes. New immutable test rows were retained until whole-container removal; no trigger was disabled to delete history. verify-legacy-subset separately identifies only owned M3 extra rows. Both exact containers were reverified and removed after evidence capture; no verification servers were left running.

See evidence/milestone-3/legacy-before.json, legacy-preservation.json, legacy-before-final.json, legacy-preservation-final.json, migration-artifacts.json and schema-after.sql. This is representative data, not a restored customer backup or approval for a drifted existing environment.

## 10. Remaining blocked gates

Separately unresolved: valid Clerk staging/authenticated browser acceptance; real ImageKit/Cloudinary transfers; populated schema/ledger inventory; baseline 001 approval; revision 002 approval; verified real backup/restored-copy rehearsal; full interactive/hydration/visual acceptance; matched writer/DB-role operational rollout.

Existing historical compatibility/reporting mode is not a complete sanitizer or proof for the full customer corpus. The explicit migration plan must review baseline defaults/unique/FK behavior, including Template status visibility. No real customer data was used.

Automatic approval review rejected implicit history creation during ordinary legacy draft edits, citing the no-automatic-conversion/silent-write boundary. That proposal did not execute. The completed safer flow imports only on explicit publication and blocks the unsafe legacy URL edit until then; ordinary edits never import revisions.

## 11. Deployment readiness

Development implementation and the stated isolated verification are complete. **Production rollout is disabled and not approved.** Neither SQL proposal is auto-deployable; no existing environment was migrated, no fake ledger entry was created and no production service was restarted/deployed.

Do not mix enabled and old/unversioned writers. Keep historical readers/cache compatibility during an approved coordinated rollout. Immutable asset bytes, organization RBAC, automatic merge, retention/deletion, draft restoration and complete visual/authenticated acceptance remain outside completed scope.

## 12. Logical commits and repository state

Backend:
- 2e68650 ? additive schema/proposal and disabled flag configuration.
- 3c90ffa ? gated atomic publication/history/concurrency implementation and tests.
- 0d5b55a ? preserved explicit publication slug repair with draft version accounting.

Frontend:
- e269233 ? publication management, snapshot-only live links, conflict/recovery and tests.

Documentation/evidence closure is committed separately in each repository; use git log for those hashes. Work is on implementation/milestone-3 in both repos; it is not merged into main, pushed or deployed by this milestone.

## 13. Milestone 4 recommendation

After production gates and separately approved migration rollout, implement the generic Next.js renderer's verified hostname mapping, Vividuss subdomains, customer custom domains, revision-aware SEO/caching/invalidation and operational TLS/domain ownership controls. Preserve one renderer and resolve each request to a selected immutable revision.

Organization/permission architecture and provider/product choices need explicit scope approval; do not infer that future modules are already implemented. AI, billing and marketplace modules should continue to consume validated contracts/publication boundaries later. Milestone 4 has not been started.

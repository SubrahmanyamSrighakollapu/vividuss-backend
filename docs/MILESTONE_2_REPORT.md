# Milestone 2 implementation and verification report

29 October 2026. Branch: `implementation/milestone-2`, created from completed `stabilization/milestone-1-5` (`a380ac2`). Starting working tree was clean. All work is local; nothing was pushed/deployed. The user explicitly authorized this milestone while prior credential-backed gates remain open.

## A. Executive summary

The safe Milestone 2 foundation is implemented: versioned Puck-compatible page JSON, contracts for every actual registration, independent recursive backend validation, shared React view implementations, a public registry without editor property UI, unified existing public routes and preserved legacy rendering. Automated checks pass within the scopes below. This is implementation completion of that foundation, not full release readiness or completion of the larger SaaS product.

No framework rewrite, customer-specific application/source generation, hostname infrastructure, AI service, immutable revision API, historical migration edit, existing-database migration or customer JSON rewrite was performed.

## B. Product alignment

[VIVIDUSS_MODULE_MASTER_PLAN.md](VIVIDUSS_MODULE_MASTER_PLAN.md) inventories all twenty supplied groups: accounts; authentication/security; organizations/workspaces; dashboards; builder; templates/categories; shared design system; JSON; generic renderer; publishing/history; domains; media; AI; extensions; billing; SEO/marketing; analytics; forms/leads; notifications/automation; platform/business modules.

Each row distinguishes actual implementation, confirmed requirements, proposals needing approval, dependencies and later milestones. No original complete commercial module specification was found. Plans, providers, automation workflows, extension marketplace rules and detailed business operations remain unapproved. Product presentation components do not imply functioning form submission, bookings, catalog, payment or billing backends.

## C. Canonical JSON

The executable contract is [index.cjs](../shared/website-contract/index.cjs): `createPageDocument`, `forkPageDocument`, `detectDocumentFormat`, `retainDocumentEnvelope`, `inspectDocument`. [page.schema.json](../shared/website-contract/page.schema.json) describes interchange structure; [component-contracts.json](../shared/website-contract/component-contracts.json) describes actual fields/defaults/slots. See [complete specification and examples](CANONICAL_WEBSITE_JSON.md).

New documents retain native Puck shape and add explicit identity/version metadata:

```json
{"format":"vividuss.puck.page","schemaVersion":1,"registryVersion":1,
 "documentId":"stable-document-id","root":{"props":{}},
 "content":[{"type":"Heading","props":{"id":"heading-1","text":"Welcome"}}]}
```

Document identity is independent of the Prisma page ID, stable on save and forked on explicit canonical duplication. Old unversioned documents remain unversioned. Null editorData with legacy sections stays protected against implicit Puck replacement. Future unsupported versions fail without downgrade. Known historical root/node extensions are retained by the editor adapter; opaque top-level data is preserved. No read operation versions or writes existing JSON.

The page document is separate from the website publication snapshot. [publicationSnapshot.js::buildPublicationSnapshot](../backend/src/lib/publicationSnapshot.js) deep-copies saved pages into the existing publishedData field and labels new snapshots `vividuss.website.snapshot`, including site identity/theme and registry/schema version. Existing snapshots are readable and untouched. Page SEO metadata supports title/description/canonicalUrl/noIndex. Layout/theme references are reserved relationships, not enabled dynamic resolvers.

## D. Component registry

Actual coverage is **57 registered types: 55 distinct view implementations plus two historical aliases**. `Header → Navbar`; `Features → FeatureCard`. Both aliases were already present in M1.5 source, absent from its previously reported count, and absent from palette lists. There are still thirteen palette categories.

| Source registry | Registrations |
|---|---:|
| layoutComponents | 11 |
| typographyComponents | 5 |
| actionComponents | 3 |
| mediaComponents | 6 |
| contentComponents | 4 |
| navigationComponents | 4, including Header alias |
| marketingComponents | 14, including Features alias |
| formComponents | 2 |
| industryComponents | 8 |
| **Total** | **57** |

[Component inventory](COMPONENT_REGISTRY_INVENTORY.md) lists all names, categories, fields, source/view paths, nested slot paths, responsive keys and URL fields. Every type has a machine-readable version-1 contract and public/editor registration; **zero missing contracts/registrations**. Contracts derive from actual definitions through [generate-component-contracts.cjs::generate](../frontend/scripts/generate-component-contracts.cjs), not a guessed list. Custom color/media/responsive field helpers expose data-only contract metadata. Defaults predating panel options are deliberately supported; id is the required component prop and existing panel props retain omission semantics.

Existing aliases/default-only values are compatibility exceptions, not removed components. [Compatibility policy](COMPONENT_COMPATIBILITY_POLICY.md) covers version changes, retirement and reviewed future namespaces. No runtime plugin loader was created.

## E. Rendering architecture

[Architecture diagram and boundaries](SHARED_RENDERING_ARCHITECTURE.md) describe the result:

1. `puck-config.js` and `components/*Components.jsx` retain palette, fields, labels and defaults as the editor adapter.
2. `views/*Views.jsx` and `views/PageRoot.jsx` own the reusable React rendering functions. All 55 original visual render expressions plus root match committed M1.5 source fingerprints, byte-for-byte after newline normalization.
3. [public-config.js](../frontend/components/website-builder/public-config.js) references the same functions and supplies data-only slot/array/object descriptors. Puck Render requires these structural fields to resolve nested slots. Public code does not import custom property renderers, media picker, builder property panels or editor adapters.
4. [PuckPublicRenderer](../frontend/components/website-builder/PuckPublicRenderer.jsx) dispatches supported documents into the render-only config. It still uses Puck's named Render export; this is not a replacement renderer or an upstream bundle-size guarantee.
5. [PublishedPage](../frontend/components/website-builder/PublishedPage.jsx) composes published theme and document-format dispatch. Both slug routes use it with [resolvePublishedPage/publishedMetadata](../frontend/lib/published-page.mjs) and the shared published fetch helper. Empty Puck documents consistently remain Puck documents. Unknown formats have explicit failure behavior. Template previews also share format detection.

Public titles, navigation branding, theme and page metadata come from the publication snapshot, so mutable draft names no longer leak into page titles. No draft fallback was added. Existing URLs remain. Shared style/animation/context utilities remain in use. Next root/tracing configuration includes the sibling shared contract directory; deployments must package it with both apps.

## F. Backend validation

[documentValidation.js::validateEditorDocument/assertDocumentReplacement](../backend/src/lib/documentValidation.js) calls the dependency-free registry validator. Canonical mode checks envelope/version/identity, root props, known component types, required IDs and duplicates, known prop types, enum/range limits, nested slots/arrays/objects, breakpoint names and values, registered URL/media fields, unsafe color/CSS content and resource bounds. Actual React text/code fields remain escaped text; JSON cannot import or execute code.

Hard bounds: 1,000,000 UTF-8 bytes per document; 2,000 components; component depth 32; raw JSON depth 64 and 50,000 visited values. HTTP bounds remain 2,100,000 ordinary / 8,000,000 draft bytes. Traversal/serialization failures reject rather than truncate. Canonical documents cannot remove format/version metadata or change identity through save replacement.

Integration points:

- `website.service.js::saveWebsitePageEditorData`: validation, existing owner lookup/legacy guard, identity protection, existing responsive merge, then validation of the final persisted payload.
- `website.service.js::saveWebsiteDraft`: same validation and identity policy per submitted page inside its existing transaction.
- `website.service.js::publishWebsite`: validates all saved page documents before constructing/updating publishedData inside the transaction.
- `template.service.js::savePageEditorData/setTemplateStatus/createPage/duplicatePage`: matching validation for relevant canonical template operations.

Controllers preserve existing success/message/status conventions and add structured `code`/`errors` with path/code/reason for contract failures. The editor displays actionable validation paths and retains its awaitable queue/flush/publish behavior. Unknown historical properties and historical field differences are reported without stripping. The read-only `inspect-document.js` tool can report exported fixtures independently of a database.

Compatibility/reporting mode intentionally is not a complete sanitizer for historical websites. Unsafe historical field warnings require corpus review before strict migration; current new canonical content is the enforced authoring boundary. No unrestricted extension fields or AI bypass was enabled.

## G. Legacy support

All thirteen original section types remain: header, hero, logocloud, about, services, portfolio, gallery, stats, testimonials, process, cta, contact, footer. [public-section-registry.js](../frontend/components/sections/public-section-registry.js) references the original views without importing section property controls. `SectionRenderer` uses that map; the original sectionRegistry and old builder controls remain preserved.

[Legacy compatibility matrix and migration plan](LEGACY_COMPONENT_COMPATIBILITY.md) explain why similarly named Puck blocks are not automatic converters. Regression tests render every original default section fixture and assert identical component references/SSR markup. Actual PostgreSQL tests preserve a representative legacy website/publication and enforce 409 on implicit replacement. Counts/IDs/ownership/original-column JSON hashes match before/after integration tests. This is representative fixture evidence, not proof for every real customer document.

## H. Tests and verification

| Command / check | Result |
|---|---|
| `npm --prefix backend run build` | PASS; Prisma Client 6.19.0 generation only, no DB operation |
| `npm --prefix backend run check` | PASS; 41 JavaScript files |
| `npm --prefix backend test` | **31 passed**, 0 failed; DB-independent |
| `npm --prefix frontend test` | **17 passed**, 0 failed |
| `npm --prefix frontend run lint` | **0 errors, 40 existing no-img-element warnings** |
| `npm --prefix frontend run build` | PASS; Next.js 16.3.5 production build |
| `npm --prefix backend run test:integration` with guarded disposable env | **8 passed**, 0 failed; actual PostgreSQL |
| `node backend/scripts/rehearse-data.js verify <captured-fixture.json>` | PASS; all six representative legacy table checksums/counts/IDs/owner preserved |
| `npm --prefix frontend run test:render` | **3 passed**, 0 failed; isolated Chrome fixture at desktop/tablet/mobile |
| `git -c core.whitespace=cr-at-eol diff --check` | PASS; existing Windows CRLF template file preserved |

Frontend tests include generated-contract equality, complete registration coverage, shared render function identity, all 56 original expression hashes, identical SSR output for every registered default fixture, nested canonical/unversioned slots, thirteen legacy fixtures, dependency boundaries, responsive CSS inheritance and published-only page selection/metadata. Existing eight save-queue/default tests still pass.

Backend tests cover envelope/resource/type/ID/URL/style/version rejection, unknown historical preservation, canonical service persistence, same validation at draft/publish/template boundaries, failed saves/publication isolation, explicit responsive override validation, downgrade protection and existing auth/startup/upload/CORS controls. Real integration adds canonical reload, unsafe edit/downgrade rejection, explicit clone identity and invalid-second-page transactional rollback, alongside original six cases.

Chrome `test:render` uses actual shared views, compiled application CSS and both configurations in an isolated setContent harness. Screenshot bytes match and typography is 42/32/24px at 1280/820/390px with no overflow. External resources are aborted. This proves that fixture's rendered pixels, not authenticated Puck UI interaction, hydration or all component variants. Evidence images: [desktop](evidence/milestone-2/render-desktop.png), [tablet](evidence/milestone-2/render-tablet.png), [mobile](evidence/milestone-2/render-mobile.png).

Actual credential-gated app suite was **not rerun/claimed passed** during M2. Valid Clerk staging sessions, signed-in edit/save/switch/publish workflows, real media-provider transfers and full interactive/browser acceptance remain blocked by missing test configuration. M1.5's documented handshake failures/skips remain historical evidence, not new M2 successes. No auth bypass was introduced. No production credentials/data were used.

Initial sandbox Node/Next worker attempts failed with spawn EPERM; the same commands passed with process permissions. Initial outside-root module resolution failed until Next's explicit root/tracing boundary included shared/. No framework upgrade or test-rule suppression was used. TypeScript 6.0.3, already installed in the previous lockfile, is now declared at the same exact version solely for test/source tooling.

Machine-readable summaries and preservation hashes are under [evidence/milestone-2](evidence/milestone-2/verification.json). [Local verification instructions](LOCAL_VERIFICATION.md) contain reproduction commands and blocked-service conditions.

## I. Database safety

No Prisma model/historical migration/reconciliation-proposal change. No existing database query, write, reset or migration. The reviewed proposal remains under docs/migration-proposals, outside automatic deployment.

A new isolated PostgreSQL 16.15 container was created: vividuss-m2-disposable-7e91, exact ID `a57654723e0a47fc116eea6342908a0106f97c43dc6ec71c136b059a57a6912d`, label milestone-2, tmpfs storage, zero host mounts, loopback port 62769. Database vividuss_disposable_m15_mtwo and role vividuss_test were verified empty before schema/bootstrap writes. The pre-existing narrow guard's m15 database/marker namespace was deliberately retained; service DATABASE_URL matched the verified disposable target.

Prisma diff generated current-schema SQL; only that new verified database received the transactional bootstrap. This was not historical migration replay, reconciliation promotion or an applied migration ledger. Fixtures/test writes were guarded and cleanup-scoped. The six original-table fixtures retained exact hashes and ownership after tests. The exact container was reverified by ID/label/mounts and removed after evidence capture. Docker was left running; existing containers/volumes were not modified or stopped. See [database safety record](DATABASE_RECONCILIATION.md).

No immutable revision model/API/rollback was implemented. A concrete additive design is documented in SHARED_RENDERING_ARCHITECTURE.md for separately approved follow-up; no experimental schema is enabled.

## J. Code changes, commits and remaining risks

Logical implementation commits:

- `cc32a12` — canonical contracts, fixtures, backend validation/persistence/snapshot helper and database-independent/integration tests.
- `9ca2cb4` — shared view extraction/editor adapter/public registry, legacy render-only registry, route/metadata dispatch, editor envelope preservation, source tooling, pinned existing dev tool, SSR/source/boundary/Chrome tests.
- Documentation/evidence closure is committed separately with this report; use `git log` for its hash.

Changed groups: shared/website-contract; backend documentValidation/publicationSnapshot, website/template services/controllers and tests; frontend website-builder adapters/views/fields/public renderer/editor, sections render registry, slug/template routes, published-page/fetch utilities, Next root configuration, lint view checks, test tooling and lockfile metadata. [Inventory](COMPONENT_REGISTRY_INVENTORY.md) provides per-component source/function locations. No unrelated source or legacy component removal.

Remaining risks:

1. Historical mode preserves/report-warns on old props, URLs and enum differences; it is not strict sanitation. Full real-data inventory/approval is absent. Unknown metadata in reordered array items needs runtime/customer-fixture verification.
2. Publication storage is still overwriteable and lacks optimistic concurrency; per-tab save queues do not prevent cross-tab overwrite. Existing explicit slug edits can update the published slug.
3. Template chrome/theme ownership is not frozen per website revision. Reference fields reserve future relationships; do not promise enabled global propagation.
4. Authenticated application workflows, media transfers, hydration/interactions and full visual corpus remain unverified. SSR parity is broad; browser pixel parity is deliberately fixture-scoped.
5. Deployment artifacts now need the sibling shared contract folder. Upstream Puck's Render package remains a dependency; source boundaries are tested but no bundle-size target was claimed.
6. Forty known image optimization warnings remain. Form/commerce blocks remain presentation-only. Tenant organizations/RBAC, domains, cache invalidation, AI, billing and business modules are not implemented by this milestone.

## K. Next milestone recommendation

Recommend a separately approved **publication integrity milestone**: immutable published revisions and atomic current-revision selection, rollback/restoration, optimistic draft concurrency, and frozen website metadata/layout/theme ownership. First satisfy staging Clerk/media acceptance and review the actual target database/backup/reconciliation state; existing-environment migration/promotion still needs explicit approval.

Then approve organization tenancy/publishing permissions and generic hostname resolution, Vividuss subdomains, verified custom domains/TLS, revision-aware SEO/caching and invalidation. Keep the same shared Next.js renderer. AI JSON proposals/recipes, entitlements/metering and tenant business modules can follow those stable boundaries. Detailed module/provider choices require product approval. No next milestone is started automatically.

## Acceptance disposition

| M2 criterion | Disposition |
|---|---|
| Full module planning distinguishes approval states | Implemented; twenty groups documented |
| Canonical versioned JSON | Implemented; tested v1 contract |
| Every current registration has contracts | Verified 57/57 including aliases |
| Backend recursive save/publish validation | Implemented and unit/real-DB verified within canonical scope |
| Existing unversioned compatibility | Verified representative fixtures/PG; full customer corpus unverified |
| Editor/public separation and shared implementations | Verified source/dependency/registry/SSR checks |
| Unified current homepage/subpage dispatch | Implemented; helper/SSR/build verified; live Clerk route UI gated |
| All thirteen legacy section types supported | Verified default SSR fixtures plus representative PG preservation |
| Responsive behavior | Existing source preserved; fixture Chrome parity verified across three widths |
| No silent stored JSON rewrite | No existing data accessed; read helpers/fixtures preserve data; new canonical creation/explicit copies/publications only |
| Builds/tests | Passing as tabulated; external-service app gates remain open |
| No unapproved existing migration | None applied; proposal held |
| No customer-specific React/Next generation | None introduced |
| Foundation for revisions/hostname rendering | Boundaries/design prepared; follow-up behavior intentionally not enabled |

Milestone 2 foundation work is complete within the stated verification boundaries. Release approval remains open pending real staging service/browser acceptance and the independent database rollout decision.

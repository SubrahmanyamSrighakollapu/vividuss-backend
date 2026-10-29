# Current architecture

Vividuss has two independent root-level repositories, vividuss-frontend and vividuss-backend. Both include identical shared/website-contract data; no monorepo restructure or new customer application was introduced.

The frontend is Next.js 16/React 19/Clerk/Puck. Fifty-seven registered types (55 shared views plus Header/Features aliases) and thirteen legacy sections remain preserved. Puck editor adapters are separate from the public render-only registry. Existing homepage/subpage slug routes share PublishedPage and snapshot-only metadata; no hostname routing is implemented.

The backend remains Express/Prisma/PostgreSQL/Clerk with userId ownership, canonical validation, bounded requests, optional media providers and existing legacy compatibility. Organizations/tenant RBAC are still future work.

## Milestone 3 development state ? disabled by default

WebsiteRevision stores immutable JSON/hash/actor/time/kind/restoration provenance. WebsitePublicationState stores website draft/publication counters, the active revision pointer, reserved published slug and website-owned draft layout. No scalar columns were added to existing Website/Page tables.

Enabled writes require expected versions. Existing helpers execute in one row-locked transaction via publicationAdapter/publicationContext; coherent draft reads use RepeatableRead. Publish validates saved multi-page content, creates a revision, updates the active pointer and mirrors the same snapshot into publishedData atomically. Restoration creates a new event without replacing current drafts. Database guards prohibit revision mutation/deletion.

New website creation can copy template chrome into website ownership while enabled. Existing sites never silently acquire template layout. Ordinary legacy edits do not import history; changing an unadopted live legacy website URL requires explicit publish first. First explicit publish preserves the old cache verbatim as LEGACY_IMPORT history. No automatic JSON conversion exists.

Enabled public resolution selects the active immutable snapshot, with a legacy-cache adapter for unadopted sites. Name/theme/SEO/page order/routing and supported header/footer come from that selected snapshot. Explicit website-owned layout policy prevents historical inert layout fields becoming visible. Editor/dashboard live links use published routing identity.

The frontend adds owner history/inspection/restore, publish confirmation, header/footer draft controls and stale-save recovery downloads. It advances tokens only from successful acknowledgements. Authenticated UI/hydration and provider transfers still require staging acceptance.

## Rollout and verification boundary

VIVIDUSS_PUBLICATION_REVISIONS is disabled/unset by default. Default-mode services work against the M2 database baseline without revision tables; eight real PG tests verified that before the additive proposal was installed. Enabled startup rejects missing schema/guards. Committed migrations still omit held baseline and revision proposals; neither is approved for existing databases.

M3 isolated verification: backend 37 unit tests; frontend 24 unit/SSR/helper tests; 25 guarded PostgreSQL integration tests; six isolated Chrome rendering/recovery cases. Both builds pass. Frontend lint has zero errors and 41 image warnings (40 preserved plus one new website-chrome native image). These results do not prove authenticated Clerk editor/history flows, real media transfer or customer-corpus migration.

See MILESTONE_3_REPORT.md, PUBLICATION_REVISIONS.md, PUBLICATION_API.md and MILESTONE_3_ROLLOUT.md. Revisions are implemented/tested, not live or production-approved. AI, billing, extensions, domains/TLS and further business modules remain outside this milestone.

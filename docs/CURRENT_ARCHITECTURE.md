> Standalone repository layout: application files are at this repository root and shared contracts are in ./shared. The architecture/commands below record the original two-app milestone baseline. Use [README](../README.md) for current local commands and [split notes](REPOSITORY_SPLIT.md) for cross-repository ownership.

# Current architecture

Two independently installed applications: frontend (Next.js App Router/React/Puck/Clerk) and backend (Express/CommonJS/Prisma/PostgreSQL). A small dependency-free shared/website-contract boundary is consumed by both; deployments must include that sibling directory. No workspace/application restructure occurred.

Milestone 2 separates editor fields/palette/defaults in puck-config.js and components/*Components.jsx from reusable views/*Views.jsx and PageRoot.jsx. Public Render consumes public-config.js with render-only structural slot descriptors, not editor fields/media/property panels. There are 57 registrations: 55 distinct visual implementations plus Header→Navbar and Features→FeatureCard historical aliases; 13 palette categories. All have generated data contracts and matching public/editor registration tests. Legacy SectionRenderer now uses a render-only thirteen-type map and remains required.

WebsitePage.editorData stores editable JSON alongside responsive configuration and legacy sections. New pages use vividuss.puck.page/schemaVersion 1/registryVersion 1/documentId while preserving Puck root/content/props/slots. Existing unversioned documents remain unversioned; legacy section pages remain protected from implicit Puck replacement. Backend validates canonical props/slots/IDs/responsive values/URLs and bounded depth/count/bytes; historical mode reports compatibility differences without stripping them. Saved canonical identity/format cannot be downgraded through save APIs.

Publishing validates saved pages and copies them into Website.publishedData, now labelled vividuss.website.snapshot for new publications. Existing snapshots are not rewritten. This is a replaceable snapshot, not immutable revision storage or cross-tab concurrency control. Public sites still resolve by path slug. Homepage/subpage share PublishedPage/resolvePublishedPage/format dispatch and published-only theme/SEO metadata. Empty Puck pages no longer trigger divergent fallback. Unsupported formats fail explicitly. Template previews share format detection.

Clerk users own websites and media through userId. There are no tenant/membership models yet. Admin permission is Clerk publicMetadata.role === admin, set through trusted Clerk administration.

Media uploads use ImageKit lazily; existing Cloudinary records retain their provider URLs/deletion path. Missing media credentials must not stop unrelated routes.

Global layout settings currently belong to templates. Their existing customization is preserved, but template globalLayout is not copied into customer Website records; publication-consistent chrome/theme ownership is follow-up work. Canonical reference fields reserve a relationship, not an enabled resolver. Existing responsive/view function semantics were preserved; isolated fixture pixels match at desktop/tablet/mobile, not a complete signed-in visual acceptance claim.

Committed historical migrations omit newer schema additions. Milestone 1.5 rehearsed the reviewed additions on identified disposable PostgreSQL, with zero final schema differences and preserved representative legacy data. The user chose to keep SQL outside deployment; existing environments remain unmigrated. See DATABASE_RECONCILIATION.md.

Milestone 1.5 quality: full frontend lint has zero errors (40 image-optimization warnings). Build, unit tests and six real database integration tests pass. Initial loads use pure fetchers and cancellation-aware promise settlement; event refreshes retain explicit loading/error state. Turbopack root is explicit. Live negative-auth/CORS/upload-order checks pass. Valid signed-in browser/editor and provider transfers remain unverified without staging credentials; document navigation also needs a working Clerk development handshake.

Milestone 2 verification and boundaries: see MILESTONE_2_REPORT.md, CANONICAL_WEBSITE_JSON.md, COMPONENT_REGISTRY_INVENTORY.md, SHARED_RENDERING_ARCHITECTURE.md and LEGACY_COMPONENT_COMPATIBILITY.md. New isolated PostgreSQL canonical/rollback checks passed without existing-database access. The user explicitly approved M2 while the prior external-service gates remain open; those gates have not been relabelled complete.

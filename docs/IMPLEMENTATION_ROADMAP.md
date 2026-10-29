# Implementation roadmap

1. Milestone 1: stabilize configuration/startup, commands/tests, global layouts/categories, request handling, editor save/publish ordering, and staging boundaries.
2. Milestone 1.5: lint and disposable PostgreSQL/representative-data gates verified. Finish valid-Clerk browser/editor and provider acceptance before closing Milestone 1. Keep tested SQL outside deployment per user decision; existing-environment application requires separate approval.
3. Milestone 2: canonical versioned page contracts, complete registry validation, shared React views/render-only public registry and unified slug rendering implemented. Legacy compatibility is preserved; no automatic converters. See MILESTONE_2_REPORT.md for bounded verification and remaining staging gates.
4. Next publication milestone: separately approve immutable revisions/rollback, optimistic concurrency and frozen website layout/theme publication consistency. Reconcile the actual target database through the existing approval/rehearsal strategy before schema application.
5. Organization tenancy/RBAC, shared hostname resolution, Vividuss subdomains, verified custom domains, server SEO and revision-aware caching. Preserve one generic Next.js application.
6. Validated AI JSON proposals/undo/recipes, entitlements/metering/subscriptions, and tenant-scoped business modules. Detailed product choices still require approval; see VIVIDUSS_MODULE_MASTER_PLAN.md.

Milestone 1 does not claim cross-tab concurrency, immutable revisions, complete component schema validation, or visual parity without browser verification. M2 adds strict validation for canonical content and bounded SSR/isolated Chrome parity; historical reporting mode is not a complete sanitizer or corpus migration.

M2 was explicitly authorized by a subsequent implementation brief. Do not start the next publication/domain/AI milestone automatically. Signed-in Clerk and real provider acceptance remain prerequisites for release readiness.

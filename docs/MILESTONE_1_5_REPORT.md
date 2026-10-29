# Milestone 1.5 — stabilization closure and verification

Branch: stabilization/milestone-1-5, based on Milestone 1 commit 83786c3. Initial worktree was clean. All safe workstreams were attempted; Milestone 2 was not started.

## Implemented changes

- Fixed all 42 frontend lint errors without disabling rules. Internal Next.js links replace literal internal anchors; JSX apostrophes are escaped. Initial async loads now use pure fetch functions and cancellation-aware promise settlement. Event refreshes retain loading/error behavior. Signed-out views derive their loading guard from authentication state instead of synchronous effect updates.
- Fixed the missing websiteSlug navigation memo dependency. Kept all 55 Puck components and all legacy views.
- Set an explicit Turbopack root without changing repository layout or deleting lockfiles. The previous multiple-lockfile build warning is gone.
- Added guarded disposable database tooling, canonical preservation checks, a representative legacy fixture, a public browser fixture and six real PostgreSQL integration tests. The integration runner now executes only the new guarded suite; historical smoke scripts remain excluded.
- Added pinned development-only Playwright 1.56.1 and desktop/mobile acceptance cases using installed Chrome. No application framework versions were upgraded and no auth bypass was added.
- Updated continuity/safety documentation and preserved verification evidence under docs/evidence/milestone-1.5.

## Executed checks

| Check | Actual result |
|---|---|
| Frontend full lint | PASS: 0 errors, 40 warnings |
| Frontend unit tests | PASS: 8 |
| Frontend production build | PASS; root inference warning resolved |
| Backend syntax checks | PASS: 37 JS files |
| Backend unit/safety tests | PASS: 19 |
| Backend Prisma generation | PASS after stopping our DLL-holding verification server |
| Prisma schema validation | PASS |
| Guarded PostgreSQL integration tests | PASS: 6 |
| Fresh historical migration replay | PASS: all three migrations on verified empty database |
| Proposal/schema comparison | PASS: generated diff agrees with reviewed candidate |
| Final disposable schema comparison | PASS: No difference detected, exit 0 |
| Legacy preservation before/after upgrade | PASS: all six original rows, IDs, owner and checksums match |
| Preservation after integration cleanup | PASS before adding separate browser fixtures |
| Playwright final run | 2 live API cases passed; 6 document cases explicitly skipped/blocked |
| Initial browser attempt | 2 passed, 6 failed at external Clerk development handshake; not application assertions |
| Git diff checks | PASS |

Commands: npm --prefix frontend run lint/test/build; npm --prefix backend run build/check/test; guarded npm --prefix backend run test:integration; installed Prisma CLI validate and migrate diff; npm --prefix frontend run test:browser. See LOCAL_VERIFICATION.md for environment/target controls.

The 40 remaining warnings are all @next/next/no-img-element, enumerated in evidence/milestone-1.5/lint-summary.json. Arbitrary customer URLs, dimensions and existing layouts make mechanical Next Image conversion unsafe without compatibility work. No error rule was weakened. Browser runner NO_COLOR/FORCE_COLOR warnings are environment cosmetics, not production build failures.

## Database safety and evidence

Created only vividuss-m15-disposable-7c18, ID 3e155bbed86db7e5a3712e6ed50445a51b76be340d29c3edb302921c2e309780, PostgreSQL 16.15, label vividuss.scope=milestone-1.5, tmpfs storage, no host volumes, loopback port 57783. Verified vividuss_disposable_m15 / vividuss_test and zero public tables before writes. Existing containers/databases were not queried or modified.

After replaying the three historical migrations, Prisma identified two missing tables, eleven columns on existing tables, six indexes and one FK plus defaults/primary keys. See schema-before.sql. The candidate SQL was applied transactionally only to the new representative-fixture database; final schema matches schema.prisma (schema-after.sql).

The fixture covers Template, TemplatePage, TemplateSection, Website, WebsitePage and WebsiteSection, one row each. It contains nested/unknown fields, Unicode (including café and 世界), ownership fixture-owner, relations and a published snapshot. Canonical JSON sorts object keys while preserving arrays/dates/Unicode. All original-row checksums and IDs matched after upgrade and after integration cleanup; legacy-preservation.json records the exact hashes. This is a representative-data rehearsal, not a customer-backup restore or proof for every document variant.

The integration suite verifies actual JSON save/reload, responsive/unknown props, publishing the latest saved two-page draft, isolation of subsequent edits, owner checks, failed-save preservation, and read-only default layouts/custom layout round trips. A temporary fixture-specific PostgreSQL trigger forced publication failure; Prisma's transaction preserved the previous publishedData, publishedAt and isPublished. Test-created triggers/functions and records were cleaned up. Legacy template/site JSON remains readable and implicit Puck replacement is rejected.

Migration promotion remains intentionally incomplete. Automatic review rejected a combined deployment-artifact/additional-database command before execution. The user then explicitly chose to keep the tested SQL as a proposal. No extra database or new Prisma migration directory was created; no historical migration was edited or falsely marked resolved. Committed history alone still does not reproduce schema.prisma. Existing-environment inventory/application and artifact promotion require separate approval.

## Browser, Clerk and media results

Real frontend and backend ran on isolated local ports 3105 and 5105 against the disposable database. There were no valid Clerk staging keys or accounts in the supplied configuration, so deliberately nonworking test placeholders were used only for negative/public checks.

Actual Chrome desktop/mobile navigation attempts redirected to clerk.example.test/v1/client/handshake with dev-browser-missing and failed DNS. Six document cases therefore could not reach page assertions. Initial and final summaries are retained in the evidence directory. They are blocked, not passed. Later runs explicitly skip these cases unless CLERK_STAGING_CONFIGURED=1 is set after installing valid staging configuration and rebuilding. That flag never bypasses Clerk.

Two live Playwright API cases (desktop/mobile projects) passed: missing/invalid publish credentials and anonymous admin access rejected, malformed upload rejected at authentication before parsing, forbidden Origin rejected and configured CORS preflight accepted. Existing unit tests exercise simulated admin/non-admin identities and disguised-SVG rejection. Real PostgreSQL tests exercise owner scopes. These are not valid-session cross-user HTTP/browser tests.

Still blocked: signed-in editor open/edit/save/reload, page-switch retention in a real browser, immediate publishing/failure UI, desktop/mobile visual equivalence, authenticated global-layout UI persistence, true non-admin/account ownership HTTP flows, and actual ImageKit/Cloudinary transfers. Backend unit/queue/database tests cover underlying logic but do not replace those workflows. No valid provider keys were available; existing stored media URLs were untouched.

## Files changed

- Lint/loading/navigation: frontend/app/admin/categories/page.jsx; app/admin/page.jsx; app/admin/templates/page.jsx; app/admin/templates/new/page.jsx; app/admin/templates/[id]/editor/page.jsx; components/media/MediaLibraryModal.jsx; components/website-builder/components/navigationComponents.jsx; next.config.mjs.
- Database tooling: backend/scripts/run-integration.js; disposable-target.js; rehearse-data.js; seed-browser-fixtures.js; tests/disposable-safety.test.js; tests/integration/persistence.test.js.
- Browser tooling: frontend/package.json and package-lock.json; playwright.config.mjs; tests/browser/public.spec.mjs; root .gitignore.
- Continuity: AGENTS.md; docs/CURRENT_ARCHITECTURE.md; IMPLEMENTATION_ROADMAP.md; LOCAL_VERIFICATION.md; DATABASE_RECONCILIATION.md; this report; docs/evidence/milestone-1.5/*.

## Closure recommendation

Do not mark Milestone 1 fully closed. Lint and disposable database gates are verified, but credential-backed browser/media acceptance remains open, and migration promotion is intentionally held by user decision. Obtain Clerk staging keys/accounts and provider test configuration, rebuild for that configuration, complete the remaining UI/security/media checklist, and review any existing-environment drift separately. Do not start canonical JSON or renderer refactors without the separate Milestone 2 brief.

No cross-tab concurrency, immutable revision storage, tenant redesign, hostname renderer, AI, customer-specific applications or React generation was introduced.

Cleanup: stopped only our positively identified local verification servers and removed only the exact ID/label-verified disposable container. Its fixture data was temporary; evidence and reproducible fixture scripts remain. Existing Docker containers were left running and untouched.

Implementation commits:
- d767644: frontend lint, async loading, navigation and build-root fixes.
- f829327: disposable safety, data preservation and PostgreSQL integration tests.
- c37854b: credential-gated browser acceptance tooling.

The report/continuity commit hash and final clean Git status are recorded in the handoff. Historical migrations, schema.prisma, backend lockfile and application framework versions are unchanged.

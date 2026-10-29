> Standalone repository layout: application files are at this repository root and shared contracts are in ./shared. The architecture/commands below record the original two-app milestone baseline. Use [README](../README.md) for current local commands and [split notes](REPOSITORY_SPLIT.md) for cross-repository ownership.

# Local and staging verification

Use a supported Node installation; this milestone was verified with Node 24.20.0 / npm 11.19.0. Install each application from its existing lockfile, without upgrading packages:

```powershell
npm --prefix backend ci --ignore-scripts --no-audit --no-fund
npm --prefix frontend ci --ignore-scripts --no-audit --no-fund
npm --prefix backend run build
npm --prefix backend run check
npm --prefix backend test
npm --prefix frontend test
npm --prefix frontend run lint
npm --prefix frontend run build
```

Backend build generates Prisma Client only. Its deliberately unreachable URL fallback is scoped to the generation subprocess and never used for migration, seed, startup, or integration commands. The CLI may download its lockfile-pinned engine. No database connection is needed for generation.

Copy backend/.env.example to backend/.env and frontend/.env.example to frontend/.env.local when configuring your own local instance. Supply actual Clerk test-instance keys. Provision an administrator through trusted Clerk publicMetadata.role = admin; email addresses never grant permission. Do not use production credentials or data. API_URL is server-reachable; NEXT_PUBLIC_API_URL must be browser-reachable and is embedded at build time. Both accept a trailing slash.

```powershell
npm --prefix backend start
# In a separate terminal:
npm --prefix frontend run dev
```

Run the backend from its own directory through npm --prefix (or cd backend) so dotenv loads the intended .env. Missing DATABASE_URL, Clerk keys, or explicit CORS_ORIGINS fails startup. ImageKit is optional until a media operation; missing configuration returns 503 for upload. Existing Cloudinary deletion support and stored URLs are preserved. /api/health is liveness only, not a database-readiness claim.

Security: CORS_ORIGINS is a comma-separated exact origin list, without paths or wildcard. Mutations are bounded to 120/minute/IP in this process; a bounded 10,000-key map expires entries. No proxy headers are trusted automatically. A reverse-proxy deployment needs a reviewed trust-proxy/shared-rate-limit policy; the current limiter is staging protection, not distributed abuse prevention. Uploads require Clerk before Multer and allow JPEG/PNG/WebP/GIF up to 10 MiB; new SVG uploads are rejected, existing URLs remain readable.

JSON limits: Puck document 1,000,000 UTF-8 bytes; ordinary API JSON request 2,100,000 bytes; PATCH /api/websites/:id/draft request 8,000,000 bytes. The editor sends responsive settings both within the document and as a separate field, so the request allowance covers that duplication plus envelope overhead. Draft documents retain the per-page limit. HTTP envelope overhead counts toward request limits. Malformed JSON returns 400; oversized requests/documents return 413. Never truncate or automatically convert stored JSON. Check upstream proxy limits before staging.

Default tests use fixtures, injected persistence/identity doubles, and a local backend startup with non-routable database placeholders. They do not prove valid live Clerk sessions, actual PostgreSQL transactions, ImageKit transfers, or browser/visual parity. The real startup test verifies anonymous/invalid Clerk requests fail without reaching persistence.

Historical backend/test-*.js scripts write to PostgreSQL and are NOT default tests. npm run test:integration now runs only tests/integration/*.test.js after verifying explicit matching TEST_DATABASE_URL/DISPOSABLE_DATABASE_URL, ALLOW_DATABASE_WRITES=disposable, loopback host, test role/name and a server-side marker. Its service DATABASE_URL is bound to that target. Do not run seed, migrate reset, destructive db push, or historical scripts on existing/unidentified databases. Migration application requires separate approval; see DATABASE_RECONCILIATION.md.

Known architectural limits: no cross-tab concurrency, immutable revisions, tenant RBAC, or hostname delivery. M2 adds full registry-driven recursive validation for canonical content; unversioned content stays in compatibility/reporting mode. Legacy rendering remains active; editor-data APIs reject implicit Puck creation over legacy sections. Publication from the website shell can still snapshot saved legacy data without fabricating an empty Puck document.

## Milestone 1.5 acceptance

Full lint passes with zero errors and 40 reviewed no-img-element warnings. Native images remain for arbitrary customer URLs and legacy layouts; mechanical Image conversion needs URL/dimension/layout compatibility checks. The stale navigation memo dependency is fixed. Explicit turbopack.root removes root inference warnings without restructuring.

On Windows, Prisma generation can fail with EPERM while your backend holds query_engine-windows.dll.node. Stop only your own verified server before generating; regeneration then passed. Never stop unrelated services to release a lock.

Browser tooling is pinned development-only @playwright/test 1.56.1 and uses installed Chrome. Default tests exclude browser/integration directories. Start the actual apps on isolated ports, configure BROWSER_BASE_URL/BROWSER_API_URL, and run npm --prefix frontend run test:browser. Six document cases are explicitly skipped without CLERK_STAGING_CONFIGURED=1; two live API security cases can execute. Set that flag only after providing valid Clerk staging configuration and rebuilding. The flag does not disable Clerk. Initial placeholder-key attempts redirected to an unavailable Clerk handshake and failed DNS; do not bypass that handshake. Signed-in editor/global-layout/publish, visual parity and real media transfers still require staging keys/accounts. Never use production keys/data.

Disposable reconciliation and six real PostgreSQL integration tests passed. See DATABASE_RECONCILIATION.md and MILESTONE_1_5_REPORT.md for evidence and remaining gates. Historical smoke scripts remain excluded.

## Milestone 2 contract and rendering verification

Both applications now require the sibling shared/website-contract folder. Keep it in local/staging build artifacts; Next turbopack/output tracing root explicitly includes the repository root. Existing application installation/lockfiles remain separate. TypeScript 6.0.3, already installed through the original lockfile, is now an explicit pinned development-only dependency for trusted-source test transpilation; no runtime framework versions changed.

```powershell
node frontend/scripts/generate-component-contracts.cjs
node frontend/scripts/generate-component-inventory.cjs
npm --prefix backend test
npm --prefix frontend test
npm --prefix frontend run lint
npm --prefix frontend run build
npm --prefix frontend run test:render
node backend/scripts/inspect-document.js shared/website-contract/fixtures/unversioned.json
```

Contract generation reads trusted source definitions; it never evaluates submitted JSON. Registry tests require generated data to match actual fields/defaults/categories and both renderer registrations. The read-only inspection command prints structured compatibility warnings and does not query a database. Do not edit generated component-contracts.json by hand to hide a mismatch.

test:render requires installed Chrome and a successful build for compiled CSS. Its isolated setContent harness renders the real shared nested views through both configs, compares screenshot bytes and checks 42/32/24px typography at 1280/820/390px widths. It starts no app server, sends no authenticated requests, uses no database, and aborts external resources. It is not a signed-in editor/hydration test or an authentication bypass. test:browser remains the actual credential-gated app suite from M1.5.

Integration suite now includes canonical save/reload, unsafe-edit/downgrade rejection, identity forking and real multi-page rollback. It still requires connectDisposable's exact allowlist and marker. M2 used a fresh tmpfs PostgreSQL container and the legacy-named guard namespace, bootstrapped unchanged current-schema SQL only there, then verified representative original hashes. No deployable migration was added/applied. Reproduction requires newly verified disposable resources; never reuse the now-removed test container/port from the report.

Windows sandbox may reject Node/Next/Chrome workers with spawn EPERM; run the same command with the appropriate local process permission. Do not weaken tests or framework versions to work around it. Clerk staging and media transfer acceptance remain blocked unless real test credentials are supplied.

## Milestone 3 standalone commands and gates

Run from each repository root. Backend: npm run build, npm run check, npm test. Frontend: npm test, npm run lint, npm run build, npm run test:render (installed Chrome required). Default tests remain database-independent. New isolated browser cases verify local JSON downloads as well as three-width shared rendering.

Leave VIVIDUSS_PUBLICATION_REVISIONS disabled/unset in ordinary unapproved environments. No frontend build flag is needed: UI capabilities come from authenticated backend draft responses. New revision routes are disabled until the backend gate is enabled. Enabled startup checks schema/models/guards; never enable it just to suppress a migration error. See PUBLICATION_API.md for expected version headers.

Guarded integration uses matching TEST_DATABASE_URL/DISPOSABLE_DATABASE_URL and service DATABASE_URL, ALLOW_DATABASE_WRITES=disposable, loopback/test role/database allowlist and server marker. The new M3 worker enables revisions only in its own verified test process; old integration workers retain disabled compatibility. Prepare the approved disposable schema in the documented order before npm run test:integration. scripts/verify-legacy-subset.js compares captured original fixtures while separately checking retained immutable test rows. Do not disable triggers or delete history for cleanup; remove only the owned disposable container after evidence capture.

Authenticated Clerk app workflows, actual media transfers and full interactive/hydration/customer-corpus acceptance remain blocked without real test configuration. No authentication bypass was added.

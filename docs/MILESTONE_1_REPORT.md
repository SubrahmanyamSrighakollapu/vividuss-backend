# Milestone 1 stabilization report

Baseline: `master`, `da62ca6`, clean worktree. Implementation branch: `stabilization/milestone-1`.

## Result

All six database-independent workstreams have implementations and automated coverage. This is not an all-green production-readiness claim: full frontend lint remains failing on existing code, and database/browser/external-provider verification is incomplete.

- Environment examples, URL composition, required-core validation, lazy ImageKit and backend production startup are implemented.
- Lockfile installs completed without lifecycle scripts or major upgrades. Prisma generation has a generation-only unreachable URL fallback; no database is contacted.
- Default Node test suites are database-independent and use failing assertions. Historical DB-writing smoke tests are excluded and the integration command fails closed.
- Template global layouts have explicit defaults/state, actual loading, preserved unknown fields, and queued explicit saves. GET never persists defaults. Template-only controls stay scoped to templates.
- `/api/categories/admin` is protected and ordered before the ID route; both admin category callers use it. Public listing remains active-only.
- JSON document/request bounds and predictable errors are implemented, including the separate multi-page draft request limit. Existing JSON is never truncated or converted.
- The editor exposes awaitable flush. Queued saves wait for acknowledgement, latest changes are drained, failures block publication/navigation, and a synchronous transition gate prevents duplicate publish/page actions. Template global-layout edits participate in flush. Page-bound queues cannot redirect writes to another page.
- Legacy pages are blocked from implicit Puck editing at UI and service layers; existing legacy sections remain navigable, publishable from saved data, and publicly renderable.
- Upload authentication precedes Multer; SVG uploads (including SVG disguised as PNG) are rejected. Admin email grants and creation-payload logging are removed. CORS origins and bounded mutation-rate protection are explicit.

## Verification

Commands run with Node 24.20.0 / npm 11.19.0:

| Command | Actual result |
|---|---|
| `npm --prefix backend ci --ignore-scripts --no-audit --no-fund` | Passed; existing lockfile, 194 packages |
| `npm --prefix frontend ci --ignore-scripts --no-audit --no-fund` | Passed; existing lockfile, 481 packages |
| `npm --prefix backend run build` | Passed; Prisma Client 6.19.0 generated; no database connection |
| Prisma `validate --schema=prisma/schema.prisma` | Passed with unreachable validation-only URL |
| `npm --prefix backend run check` | Passed; 32 source/script/test JS files checked |
| `npm --prefix backend test` | Passed: 17 tests; see final command output if suite expands |
| `npm --prefix frontend test` | Passed: 8 tests |
| `npm --prefix frontend run build` | Passed production compilation and route generation |
| Frontend full ESLint | Fails: 42 existing errors, 41 warnings; initial baseline had 45 errors, 41 warnings |
| Targeted ESLint for PuckEditorClient and Builder | Passed, including newly enabled no-undef checks |
| `npm --prefix backend run test:integration` | Expected exit 1: refused unidentified database; no writes executed |
| `git diff --check` | Passed |

Backend tests cover real Express malformed/oversized parsing, large and multi-page request allowances, CORS, rate bounds, missing optional media configuration, layout read/save preservation, owner-scoped operations, legacy write refusal, draft error status, upload ordering/content rejection, and real local backend startup. Real Clerk middleware rejects missing/invalid tokens in the startup test. Successful admin/owner identities and persistence are simulated in unit tests; they are not live Clerk/PostgreSQL verification.

Frontend tests exercise the actual queue/transition helpers for coalescing, backend acknowledgements, immutable request snapshots, edits during save, queued failure/retry, publication ordering, page-transition ordering, duplicate action prevention, and disposal. They also check URL normalization and matching layout defaults across applications. Browser wiring and screenshot equivalence are not claimed by these tests.

## Files by workstream

Environment/startup:
- `backend/.env.example`, `frontend/.env.example`, `frontend/.gitignore`, root `.gitignore`.
- `backend/src/server.js`, new `backend/src/app.js`, `backend/src/config/environment.js`, `backend/src/config/imagekit.js`, `backend/src/services/storage.service.js`.
- New `frontend/lib/api-url.mjs`; callers in `frontend/lib/api.js`, `app/builder/actions.js`, `app/templates/actions.js`, `app/templates/page.jsx`, `app/websites/page.jsx`, `app/admin/page.jsx`, `app/admin/categories/page.jsx`, `app/admin/templates/page.jsx`, `app/admin/templates/new/page.jsx`, `app/admin/templates/[id]/editor/page.jsx`, `components/builder/Builder.jsx`, `components/media/MediaLibraryModal.jsx`, and `components/website-builder/PuckEditorClient.jsx`.

Build/tests:
- `backend/package.json`, `frontend/package.json`, `frontend/eslint.config.mjs`.
- New `backend/scripts/check-syntax.js`, `generate-client.js`, `run-integration.js`.
- New `backend/tests/authorization.test.js`, `baseline.test.js`, `http.test.js`, `startup.test.js`; `frontend/tests/saveQueue.test.mjs`.

Layouts/categories:
- New `backend/src/lib/globalLayout.js`, `frontend/components/website-builder/globalLayout.mjs`.
- `backend/src/services/template.service.js`, `backend/src/routes/category.route.js`, editor and admin callers listed above.

JSON/save/publishing:
- New `backend/src/lib/documentValidation.js`, `backend/src/middleware/requestPolicy.js`, `frontend/components/website-builder/saveQueue.mjs`.
- `backend/src/services/website.service.js`, `backend/src/controllers/website.controller.js`, editor and website/template shells listed above.

Security:
- New `backend/src/middleware/requireUser.js`; `backend/src/middleware/requireAdmin.js`.
- `backend/src/routes/media.route.js`, `backend/src/controllers/media.controller.js`, `backend/src/lib/fileValidation.js`.
- Admin UI grants in `frontend/app/admin/page.jsx` and `frontend/components/home/Header.jsx`; upload UI in `MediaLibraryModal`; creation logging in `app/templates/actions.js`.

Knowledge and database proposal:
- New root `AGENTS.md`, `docs/VIVIDUSS_REQUIREMENTS.md`, `CURRENT_ARCHITECTURE.md`, `IMPLEMENTATION_ROADMAP.md`, `LOCAL_VERIFICATION.md`, `DATABASE_RECONCILIATION.md`, this report and `docs/migration-proposals/001_schema_reconciliation.sql`.

## Remaining gates and limitations

1. Full lint errors remain in admin pages, MediaLibraryModal, and Puck navigationComponents: set-state-in-effect, literal internal anchors, and unescaped JSX text. Rules were not weakened to hide failures. Changes in the main Puck editor and Builder pass targeted lint.
2. Database schema/ledger, actual transactional rollback, and populated-data preservation are unverified. Docker CLI exists but its Linux-engine pipe is unavailable; psql was not found. No disposable database was created or identified. No schema, historical migration, ownership or publication record was modified.
3. Reconciliation SQL is a static review-only candidate outside Prisma auto-deployment. It requires actual-schema inventory, duplicate/orphan checks, restored-copy rehearsal, JSON/ownership checksums, default-visibility review, and separate application approval. Schema validation does not validate this SQL against PostgreSQL.
4. Valid signed-in Clerk sessions, ImageKit/Cloudinary transfers, and real browser save/page-navigation/global-layout behavior need configured staging/browser verification. No authentication bypass was added.
5. The production build warns about multiple lockfiles/root inference. Repository layout was preserved.
6. Limits are per document/request, not full recursive component validation. The rate limiter is single-process/IP and requires reviewed proxy/distributed controls before broader deployment.
7. No cross-tab concurrency, immutable revision storage, tenant redesign, hostname renderer, AI, or customer-specific projects were introduced. Existing template-global-layout propagation to websites remains later architecture work.

## Next milestone

Finish the isolated verification gate: resolve the remaining frontend lint findings in small changes, provide a disposable PostgreSQL instance and Clerk staging configuration, rehearse reconciliation and run browser acceptance tests. Only then proceed to canonical versioned document contracts, immutable revisions, and verified legacy migration adapters.

Implementation commits:
- `6d2ca7c`: architecture/setup and database safety documentation.
- `0504f1e`: backend startup, layout/category, request and authorization stabilization.
- `8b2cafe`: frontend URL/configuration, save/flush, page transitions and tests.

The final report commit and clean worktree are reported with `git log`/`git status` in the handoff; this document cannot embed its own commit hash. Both dependency lockfiles, schema.prisma, and all historical migrations are unchanged from da62ca6.

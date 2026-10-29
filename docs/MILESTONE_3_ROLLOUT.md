# Milestone 3 database and rollout plan

**Not approved for production application.** Backend .env.example sets VIVIDUSS_PUBLICATION_REVISIONS=disabled. New tables/functions remain migration proposals outside Prisma's deployment directory.

## Ordered artifacts

1. Original three historical migrations remain unchanged.
2. docs/migration-proposals/001_schema_reconciliation.sql remains the held M1.5/M2 baseline proposal. It fills the historical/schema discrepancy; do not blindly apply to an existing drifted environment.
3. docs/migration-proposals/002_publication_revisions.sql adds only publication state/revision tables, indexes, composite FKs, counter/pointer constraints and immutable-history triggers.

prisma/schema.prisma describes the resulting models, but schema editing/client generation does not mean the database was migrated. No fake migrate resolve or new ledger entry was used for manually rehearsed proposals. Running committed migrate deploy alone still does not produce the full resulting schema.

## Before any existing-environment application

Inventory actual schema/ledger using read-only credentials; review existing objects/duplicates/ownership and active publications. Verify backups, restore them into an approved disposable target, and hash original IDs/relationships/JSON/owners. Adjust the forward plan for actual drift, review it and obtain separate approval for both baseline and revision stages. Never edit already-applied historical migrations or use reset/db push to hide discrepancies.

Rehearse historical replay plus baseline proposal first, compare to the exact M2 schema, then apply the new additive proposal. Apply each approved script transactionally with stop-on-error. Review the baseline status default and unique/index/FK behavior. Do not add either held proposal to automatic Prisma deployment without explicit approval.

## Disabled compatibility and activation

No new scalar columns were added to existing tables. Default-off service calls keep original methods; list selections include publication state only when enabled. Before the revision proposal was installed in the M3 disposable database, the new client/default-off code passed all eight existing PostgreSQL tests against the M2 baseline. This proves that baseline's compatibility, not every unknown populated schema.

Enabled startup verifies generated models, required columns, revision immutability/truncate triggers and pointer guard. Missing schema fails startup; it does not silently fall back after partial activation.

Enable only after schema approval/application and remaining staging gates pass. Coordinate **all writer instances**: an old/default-off writer mixed with an enabled writer could bypass optimistic counters. Drain old writers; do not partially mix modes against the same websites. Deploy the matched frontend/backend revisions. Existing publishedData remains the compatibility cache for old readers, but old frontends do not implement new chrome/history UX.

Merely enabling or reading never creates history. Existing legacy sites stay on their cache until explicit publish. A live legacy draft URL edit is blocked until that explicit publish, rather than silently creating revision records during editing.

## Application rollback

Prefer disabling new writes/read-only maintenance while keeping the enabled reader serving selected immutable snapshots. The compatible cache is atomically updated on each publication/restore, so a reviewed application rollback can still read the latest cache. Do not resume old unversioned writers concurrently with enabled writers. Do not delete new tables/history or destructively reverse migrations. Restoration/roll-forward needs rehearsal; there is no automatic down migration or retention deletion.

## Executed isolated rehearsal

New container vividuss-m3-disposable-3f72, label vividuss.scope=milestone-3, exact ID e5fda4a49b531219408bf35477d3379a0b406bf50572d2dee3f8a3722771f1fa. PostgreSQL 16.15, tmpfs only, no host mounts, loopback port 62765. Database vividuss_disposable_m15_mthree / role vividuss_test / server marker vividuss-disposable-milestone-1.5 reuse the existing narrow disposable guard namespace.

Verified empty identity before writes; bound service DATABASE_URL to matching verified TEST_DATABASE_URL/DISPOSABLE_DATABASE_URL and explicit ALLOW_DATABASE_WRITES=disposable. Replayed original three migrations; seeded representative legacy fixtures; applied held 001 only there; M2 baseline comparison returned zero differences. Ran eight default-off PG tests before the revision tables existed. Enabled readiness correctly rejected missing revision schema.

Applied additive 002 transactionally only there; final Prisma structural comparison returned zero differences. Actual DB tests verify composite relationship integrity and immutability triggers beyond Prisma's structural diff. Original three-entry migration ledger remains intact; proposals were not falsely marked deployed.

New immutable M3 fixtures were deliberately retained until the whole owned tmpfs container was removed; history triggers were never disabled to clean them up. scripts/verify-legacy-subset.js proves original captured rows/counts/IDs/owners/hashes unchanged, and separately verifies extra rows belong only to M3 test fixtures. This is representative evidence, not a restored real customer backup.

## Remaining production gates

- Valid Clerk staging accounts and authenticated editor/history/publish/restore/conflict acceptance.
- Real ImageKit/Cloudinary test transfers.
- Existing populated schema/ledger inventory.
- Separate baseline and revision migration/promotion approvals.
- Verified real backup and restored-copy preservation rehearsal.
- Full interactive/hydration/visual acceptance, including website-owned chrome.
- Matched multi-instance rollout plan, appropriate DB role/privileges and operational rollback checks.

M3 code/testing is not deployment approval. Hostname routing, domains/TLS, AI, billing and extension marketplace work are not enabled here.

Final reserved-slug regression used a second fresh tmpfs container, vividuss-m3-final-42a8, ID a0a0e9b6197b868a1fbe56f8d08829d592225a41c5a255894d058b5157cc87a5, label vividuss.scope=milestone-3-final, loopback port 61841, database vividuss_disposable_m15_mthreefinal/test role/verified marker. The same ordered replay/proposals passed; 25 integration tests and final original-row hashes passed with zero structural differences. Both owned containers were removed after evidence capture. No triggers were disabled or history rows deleted.

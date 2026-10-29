# Database reconciliation — review only

No database was inspected or modified during Milestone 1. Milestone 1.5 subsequently tested an identified disposable PostgreSQL 16.15 instance. Existing-environment schemas and migration ledgers remain unknown.

Committed migrations cover initial template/site/page/section tables, Website.userId, and publication fields. They omit WebsiteCategory, MediaAsset, Template slug/globalLayout/categoryId/status/publishedAt/theme, Website.theme, page editorData/responsive, and their newer indexes/FK.

The candidate SQL in `migration-proposals/001_schema_reconciliation.sql` is deliberately outside Prisma's auto-deploy directory. It describes the forward additions from historical migration replay to the current schema; it is NOT safe to apply blindly to an existing database. It is not a claim of drift reconciliation.

Approval gates:
1. Identify target database/schema and read migration history with read-only credentials. Compare actual schema, historical replay, and schema.prisma.
2. Restore a verified backup into an explicitly disposable database. Record row counts, IDs, ownership, FK relations, publication state and canonical JSON hashes.
3. Review duplicate Template.slug values, orphan category references, existing objects and differing types/defaults. The candidate adds Template.status DEFAULT PUBLISHED to match the current schema: review visibility before any populated upgrade.
4. Determine which additions already exist. Do not edit historical applied migrations or mark a migration resolved until its actual effects are proven equivalent.
5. Rehearse empty replay and restored-copy upgrade. No DROP, TRUNCATE, resets, content rewrites, seeds or owner reassignment. The historical userId migration assigns legacy-user and must not be replayed on populated sites blindly.
6. Compare preservation evidence and run guarded integration tests. Commit the environment-appropriate forward migration only after review; application requires separate approval.

Rollback strategy: additive schema plus application rollback where compatible; otherwise rehearsed restoration/roll-forward. Do not create destructive down migrations.

## Milestone 1.5 executed rehearsal

- Created only vividuss-m15-disposable-7c18 (ID 3e155bbed86db7e5a3712e6ed50445a51b76be340d29c3edb302921c2e309780), label vividuss.scope=milestone-1.5, tmpfs storage, no host volumes, loopback port 57783. Existing containers were left untouched.
- Verified vividuss_disposable_m15 / vividuss_test and zero public tables before writes. Set the shared-catalog database comment vividuss-disposable-milestone-1.5 for guarded writes.
- Replayed the three historical migrations. Prisma's diff identified two tables, eleven columns on existing tables, six indexes, one foreign key and associated defaults/primary keys. See evidence/milestone-1.5/schema-before.sql.
- Seeded one representative row in each of the six original application tables, including relationships, ownership, nested/unknown JSON, Unicode and an existing published snapshot. No customer data was used.
- Reviewed the candidate against the generated diff and applied it ONLY to that disposable fixture database using psql --single-transaction and ON_ERROR_STOP.
- Final Prisma diff returned No difference detected, exit 0. See evidence/milestone-1.5/schema-after.sql.
- Counts, IDs, ownership and canonical SHA-256 checksums matched after upgrade and again after integration cleanup. Each original table retained one row. See evidence/milestone-1.5/legacy-preservation.json. Browser-only fixtures were added afterward.
- Six actual PostgreSQL integration tests passed, including persistence, publication isolation, owner checks, forced transactional rollback preserving the previous publication, layouts and legacy readability.

This is a representative-dataset rehearsal, not a restored customer backup or a guarantee for every independently drifted environment. No existing database was inspected or modified. Historical migrations and schema.prisma are unchanged.

The original three-entry ledger remains intact. Committed migrations alone still do not reproduce schema.prisma; SQL was manually applied only for rehearsal. No migration was marked resolved. Automatic approval review rejected a combined artifact-promotion/additional-database action; it did not execute. The user chose to keep the tested artifact as a reviewed proposal. No extra rehearsal database or deployable Prisma migration artifact was created. The candidate remains outside backend/prisma/migrations.

Reproduction requires a NEW temporary container and verified empty database. scripts/disposable-target.js requires matching TEST_DATABASE_URL/DISPOSABLE_DATABASE_URL, ALLOW_DATABASE_WRITES=disposable, loopback host, test role/name and a server-verified shared-catalog marker. Service DATABASE_URL must match that target. Default tests never invoke integration writes. Run scripts/rehearse-data.js seed <evidence.json> after historical replay, apply the proposal only there, then run verify <evidence.json> and guarded integration tests. Cleanup only the exact container created by the rehearsal after verifying ID and label. Existing-environment application and artifact promotion still require separate approval.

## Milestone 2 isolated persistence checks

M2 did not change schema.prisma, historical migrations, or the held reconciliation proposal. It created a new tmpfs PostgreSQL 16.15 container, vividuss-m2-disposable-7e91, ID a57654723e0a47fc116eea6342908a0106f97c43dc6ec71c136b059a57a6912d, label vividuss.scope=milestone-2, no host mounts, loopback port 62769. Database vividuss_disposable_m15_mtwo / role vividuss_test were verified with zero public tables before bootstrap. The old m15 name/marker namespace is intentionally reused only to satisfy the existing narrow safety guard; this is not the earlier test database.

After marking and independently checking the new target, Prisma migrate diff --from-empty generated current-schema SQL without applying a migration. That SQL was bootstrapped transactionally only on the verified disposable database, with identity/marker/empty checks immediately before CREATE statements. No deployment ledger was modified or falsely marked applied; this is a fresh current-schema integration bootstrap, not a repeat of historical migration reconciliation.

Eight real integration tests passed, including new canonical persistence/identity checks and invalid-second-page transactional rollback. Six representative legacy tables retained row counts, IDs, ownership and original-column/JSON hashes before/after tests. Evidence: evidence/milestone-2/legacy-preservation.json. This does not inventory or restore actual customer data. Cleanup removes only that exact identified container; existing containers/volumes/databases remain untouched. Reconciliation promotion/application still requires separate approval.

## Milestone 3 current proposal

The backend Prisma schema now includes two additive publication tables. Historical migrations still do not reproduce the resulting schema. Order remains original replay ? held 001 baseline reconciliation ? separately held 002_publication_revisions.sql. Neither proposal was promoted or approved for existing environments. The exact disposable rehearsal, original fixture hashes/ledger and activation gates are in MILESTONE_3_ROLLOUT.md and evidence/milestone-3.

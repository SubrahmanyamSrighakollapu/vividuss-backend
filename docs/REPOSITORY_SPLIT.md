# Standalone repository export

Imported from original monorepo commit eb7a6b56526637af99ed7f57660df7bad59bec8e. Application files are now at this repository root. shared/ and docs/ are included locally; no checkout of the other repository is required to build or run default tests. Historical milestone reports/evidence retain their original paths and commit references. README.md provides the current root-level commands.

Both repositories must carry identical shared/website-contract files. Generate contract updates in the frontend repository, review them, then copy the same files into the backend repository before coordinated deployment. Source/view metadata in the contracts is relative to the frontend repository root. No schema semantics or saved JSON were converted by this export.

The frontend layout-default test uses a committed snapshot of the paired backend helper. Update that fixture deliberately if the shared default policy changes; it is not a live cross-repository test. The original render-source hash fixture remains preserved. Its optional regeneration script requires VIVIDUSS_BASELINE_REPOSITORY pointing to the original monorepo history.

Database reconciliation SQL remains a proposal outside prisma/migrations. No migrations or database writes are performed by repository export or default CI.

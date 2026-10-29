# Vividuss implementation rules

- Keep Next.js, Express, Prisma/PostgreSQL, Clerk, and Puck. One shared public renderer; never generate customer React projects.
- Preserve legacy sections, stored JSON, ownership, and published data. No automatic conversions or silent defaults writes.
- Never run migrations or database-writing tests against populated, production, or unidentified databases. Migration application requires explicit approval.
- Explicitly authorized disposable rehearsals must verify loopback URL, test role, database identity and the disposable marker before writes. Service DATABASE_URL must match that verified target.
- Per the Milestone 1.5 decision, keep tested reconciliation SQL in docs/migration-proposals; do not promote it into Prisma's deployment directory without new approval.
- Use lockfiles; do not upgrade major dependencies to fix verification.
- Default tests must be database-independent. Integration tests require an explicitly allowlisted disposable database.
- Keep changes small and test actual application helpers. Report unverified external-service and browser behavior accurately.
- Requirements: docs/VIVIDUSS_REQUIREMENTS.md. Current state: docs/CURRENT_ARCHITECTURE.md. Roadmap: docs/IMPLEMENTATION_ROADMAP.md.

# Standalone repository
Application files are at the repository root. shared/website-contract is a versioned local copy synchronized with the paired repository. Historical milestone docs refer to the original monorepo paths; use README.md for current commands.

# Milestone 3 rollout rules
- Publication revisions remain disabled by default until baseline/revision schema and production gates are approved. Keep proposal 002 outside automatic Prisma deployment.
- Legacy history may be copied only on explicit publication; never import history on reads or ordinary edits. Require explicit publish before an unadopted legacy live-URL change.
- Enabled writes require the loaded expected versions. Never retry with a freshly fetched token or replace local unsaved work after a conflict.

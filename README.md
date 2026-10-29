# Vividuss backend

Express 5 / Prisma 6 / PostgreSQL / Clerk API. Application files are at this repository root.

Frontend: [vividuss-frontend](https://github.com/SubrahmanyamSrighakollapu/vividuss-frontend).

## Setup and verification

Use Node.js 24 and the committed lockfile:

```sh
npm ci
# Copy .env.example to .env and supply local/staging configuration.
npm run build
npm run check
npm test
npm run dev
```

`DATABASE_URL`, Clerk keys and explicit `CORS_ORIGINS` are required at startup. ImageKit is optional until a media operation. `npm start` runs the service; run it from this repository root so dotenv reads the intended file. Never commit real environment files.

Build generates Prisma Client only. Default tests are database-independent. Do not run seeds, historical test-*.js scripts, db push/reset or migrations against existing/unidentified data. `test:integration` requires the explicit disposable URL allowlist and server marker in [database safety documentation](docs/DATABASE_RECONCILIATION.md).

Historical migrations do not fully reconcile existing environments. Tested reconciliation SQL remains under `docs/migration-proposals`, outside Prisma deployment migrations. Review target schema/backups and obtain explicit approval before migration application. Repository upload does not apply migrations or modify database data.

## Shared contracts

`shared/website-contract` is a versioned local copy used by backend validation. Keep it identical to the frontend repo during contract releases. Generation/React views belong to the frontend repo; a frontend checkout is not needed for backend tests/build/startup.

See [split notes](docs/REPOSITORY_SPLIT.md) and [Milestone 2 report](docs/MILESTONE_2_REPORT.md). Historical reports reference monorepo paths; this README provides current commands. Revisions, organization tenancy and hostname delivery remain future work.

Imported from monorepo commit `eb7a6b56526637af99ed7f57660df7bad59bec8e`, without historical Git objects or environment files. The original workspace/history remains preserved locally.

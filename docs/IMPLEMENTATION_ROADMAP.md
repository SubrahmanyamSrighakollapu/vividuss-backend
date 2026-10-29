# Implementation roadmap

1. Milestones 1/1.5 stabilized startup, layout/category state, request/auth/media safety, verification commands, save queues and page transitions. Credential-backed Clerk/media acceptance remains open.
2. Milestone 2 implemented canonical page contracts, 57-registration coverage, shared React views/render-only public registry, unified slug dispatch and legacy preservation. Historical props retain explicit compatibility mode; no automatic conversion.
3. Milestone 3 implements immutable publication records, atomic publish/cache/pointer updates, history/restore provenance, website-level optimistic concurrency, published metadata/theme/layout isolation and frontend recovery/history controls. Development verification passed; the feature remains disabled pending schema/production gates.
4. Complete existing-environment inventory, baseline/revision migration approvals, backup/restored-copy rehearsal, matched writer rollout and authenticated staging/browser/media acceptance. Do not mix enabled and old/unversioned writers against the same sites.
5. Separately approve Milestone 4: generic renderer hostname resolution, Vividuss subdomains, verified custom domains, revision-aware SEO/caching/invalidation and appropriate TLS/provider/ownership controls. Keep one renderer. Organization/membership/RBAC scope needs explicit design/product approval; it is not implemented by M3.
6. Later approved milestones: validated AI JSON proposals/recovery/recipes, entitlements/metering/subscriptions, approved extension contracts and tenant business modules. Detailed provider/commercial/automation specifications remain pending in VIVIDUSS_MODULE_MASTER_PLAN.md.

Do not start Milestone 4 automatically. Do not promote or apply held migrations to existing environments without new approval. No production readiness claim follows from disposable tests alone.

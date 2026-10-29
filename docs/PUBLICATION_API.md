# Publication API v1 rollout

All routes use the existing /api/websites prefix and existing Clerk identity/Website.userId ownership. No client-supplied tenant/actor field grants authority.

With VIVIDUSS_PUBLICATION_REVISIONS=disabled/unset, old endpoints retain existing storage behavior and new history/state/layout routes return 503 REVISIONS_DISABLED after authentication. No new table query is required by normal disabled reads/writes.

## Concurrency headers

Enabled GET /:id returns data.concurrency, and GET /:id/pages/:pageId/editor-data returns coherent page JSON plus data.concurrency:

    { enabled: true, draftVersion: 7, publicationVersion: 3, activeRevisionId: "..." }

Every existing website/page/section mutation must send:

    If-Match: "draft-7"

Publish and restore additionally require:

    If-Publication-Match: "publication-3"

Use versions from the draft actually loaded/acknowledged. Never fetch a fresh token simply to retry a stale local write. Successful mutations return top-level concurrency; direct service results also carry it where appropriate. The editor advances only from successful acknowledgements, not from errors or unrelated history reads.

## Endpoints

| Method/path | Behavior |
|---|---|
| GET /:id/publication-state | Non-writing owner read: versions, active revision metadata, draft website-owned layout |
| GET /:id/revisions?before=sequence&limit=25 | Descending metadata history; maximum 50; activeRevisionId |
| GET /:id/revisions/:revisionId | Owner-only metadata and full immutable snapshot, verified by hash |
| POST /:id/publish | Existing endpoint; enabled path validates saved draft and atomically creates/selects a revision |
| POST /:id/revisions/:revisionId/restore | Confirmed new publication event using historical content; current drafts preserved |
| PUT /:id/layout | {globalLayout: object or null}; expected draft token required; drafts only until publish |
| GET /public/:slug | Anonymous existing response shape with publishedData; enabled sites add selected publication identity |

Publish preserves existing fields success/websiteId/name/slug/isPublished/publishedAt/publicUrl and adds revision metadata/concurrency. Restore returns data containing the resulting site publication/revision. Revision metadata includes id, websiteId, sequence, kind, createdAt, actorId, snapshotHash, restoredFromRevisionId. Public responses do not expose actorId/history.

Existing customSlug publish input remains validated. Explicit custom URLs and the preserved reserved/generic-slug repair update the saved draft URL atomically with publication and advance draftVersion when that field changes. Ordinary unchanged-URL publication does not change draftVersion. Restore keeps the current active site URL and restores page-level routing from the source revision.

Layout supports header/footer enabled flags, brand/logo, colors, footer text and link arrays. Unknown saved fields remain stored, but are not automatically executable/renderable. Links/URLs are validated; null means no additional website chrome. A missing layout payload is 400.

## Error contracts

| Status/code | Meaning/recovery |
|---|---|
| 401 | Missing/invalid identity |
| 404 NOT_FOUND | Site/revision/resource not owned or unknown |
| 428 VERSION_REQUIRED | Missing/malformed expected version(s); load a coherent draft first |
| 409 VERSION_CONFLICT | Another writer/publication won; retain/export local work before manual reload |
| 409 LEGACY_PUBLISH_REQUIRED | Explicitly publish once before changing an unadopted live legacy site's draft URL |
| 409 SLUG_CONFLICT | Requested published URL is reserved |
| 400 DOCUMENT_VALIDATION_FAILED / INVALID_LAYOUT / INVALID_SNAPSHOT | Fix reported paths/values; no publication changed |
| 413 | Document/publication/request bounds exceeded |
| 503 REVISIONS_DISABLED | Schema/production rollout is not enabled |
| 500 | Unexpected integrity/persistence failure; previous committed publication remains active |

Version conflicts include concurrency={enabled,draftVersion,publicationVersion,activeRevisionId}; canonical validation keeps errors=[{path,code,reason}]. Do not treat 409 as an automatic retry instruction. Errors and failed commits never advertise an uncommitted success acknowledgement.

Only legacy publishedData-compatible reads are public. Revision retrieval/inspection and restore are owner-authenticated. No arbitrary revisionId query parameter is accepted by the anonymous renderer.

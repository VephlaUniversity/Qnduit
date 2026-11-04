# Talent application activity feed

`GET /api/applications/activity-feed` requires an authenticated Talent. It is separate from the default `/my-applications` response, which remains Internal-only for Applied detection and recent applications. The additive summary-only query used by the Talent dashboard is described in [remaining analytics](application-analytics.md).

Query parameters:

- `q`: literal, case-insensitive search, at most 200 characters; title, company, location, category, work type, Internal status, activity label or recorded destination.
- `type`: `all` (default), `internal` or `external`.
- `source`: `all` (default), `employer` or `admin`.
- `page`: positive integer, default 1, maximum 100000.
- `limit`: positive integer, default 20, maximum 50.

Each collection is scoped to the authenticated Talent before joining/combining. Filters precede a global pagination facet. Results sort by `occurredAt DESC, id DESC`; Internal IDs include kind/source/record ID. External IDs are stable `external:<source>:<jobId>` group identities; source collisions remain distinct. Pagination totals count Internal rows plus External groups, not raw clicks. `pagination` includes page, limit, total and totalPages. Offset page boundaries may move when new activities arrive; refresh to see the latest records.

Internal rows use appliedAt with createdAt fallback, existing Internal statuses and current job display data. Legacy Internal rows whose jobs were removed retain the existing unavailable fallback; there is no invented historical backfill. External events are grouped by job ID and source after scoping to the authenticated Talent and before pagination. Each group returns the complete latest event selected by `clickedAt DESC, _id DESC`, plus lifetime `totalOpens`. Search applies to that latest snapshot/destination, never older matching events; it does not reduce `totalOpens`. External rows use immutable clickedAt/display/destination snapshots, independently of later job changes. Current source-specific job existence controls whether View Job is offered. Feed reads never filter away retained history merely because a job expired or was closed/deleted.

Response rows are explicitly projected to id, kind, source, label, jobId, jobExists, occurredAt, status, destinationUrl, imageUrl and allowlisted display fields. External rows have no Internal application status. Each External group is shown as one `External Application` card with “Last opened” and “Total opens”; opens record Apply clicks, not completion. Individual stored events and recording/idempotency are unchanged. Destination text/copying is exact; opening a recorded destination is an ordinary validated HTTP(S) link and does not call the recording endpoint.

This is a read-only aggregate; it does not create activities, alter statuses/counts, emit notifications or change job discovery policy. Existing recording uniqueness/readiness requirements still apply only to recording. The feed tolerates collections with no history; a query failure returns 503 instead of partial results. Existing source/default semantics on all older endpoints are unchanged.

For isolated synthetic integration tests, start disposable MongoDB at `127.0.0.1:27933` and run from `backend/`:

```sh
APPLICATION_FEED_LOCAL_TEST=1 node --test tests/applicationActivityFeed.local.test.js
```

Step 1 index evaluation is reproducible with `APPLICATION_FEED_EXPLAIN_LOCAL_TEST=1 node --test tests/applicationActivityFeed.explain.local.test.js` against the same disposable local MongoDB. It captures the actual external feed pipeline and compares existing indexes with a temporary candidate inside a uniquely named synthetic database, which is removed afterwards. With 20,000 events across 40 Talents (500 each), the existing `{talentId:1, clickedAt:-1, _id:-1}` index reads 500 documents/keys and supplies the latest-event sort. The candidate `{talentId:1, source:1, jobId:1, clickedAt:-1, _id:-1}` still requires sorting; source filtering reduces its scan to 250 in this fixture but does not justify another production index for Step 1. No model/index/provisioning changes are included. Lifetime counts still require reading the Talent's matching events; synthetic evidence is not a production performance guarantee.

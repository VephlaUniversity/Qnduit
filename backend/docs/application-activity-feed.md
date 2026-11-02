# Talent application activity feed

`GET /api/applications/activity-feed` requires an authenticated Talent. It is separate from `/my-applications`, which remains the Internal-only source for existing Applied detection, recent applications and dashboard counts.

Query parameters:

- `q`: literal, case-insensitive search, at most 200 characters; title, company, location, category, work type, Internal status, activity label or recorded destination.
- `type`: `all` (default), `internal` or `external`.
- `source`: `all` (default), `employer` or `admin`.
- `page`: positive integer, default 1, maximum 100000.
- `limit`: positive integer, default 20, maximum 50.

Each collection is scoped to the authenticated Talent before joining/combining. Filters precede a global pagination facet. Results sort by `occurredAt DESC, id DESC`; IDs include kind/source/record ID, keeping repeated clicks and collection ID collisions distinct. `pagination` includes page, limit, total and totalPages. Offset page boundaries may move when new activities arrive; refresh to see the latest records.

Internal rows use appliedAt with createdAt fallback, existing Internal statuses and current job display data. Legacy Internal rows whose jobs were removed retain the existing unavailable fallback; there is no invented historical backfill. External rows use immutable clickedAt/display/destination snapshots, independently of later job changes. Current source-specific job existence controls whether View Job is offered. Feed reads never filter away retained history merely because a job expired or was closed/deleted.

Response rows are explicitly projected to id, kind, source, label, jobId, jobExists, occurredAt, status, destinationUrl, imageUrl and allowlisted display fields. External rows have no Internal application status. Every external event is an `External Application`; it records an Apply click, not completion. Destination text/copying is exact; opening a recorded destination is an ordinary validated HTTP(S) link and does not call the recording endpoint.

This is a read-only aggregate; it does not create activities, alter statuses/counts, emit notifications or change job discovery policy. Existing recording uniqueness/readiness requirements still apply only to recording. The feed tolerates collections with no history; a query failure returns 503 instead of partial results. Existing source/default semantics on all older endpoints are unchanged.

For isolated synthetic integration tests, start disposable MongoDB at `127.0.0.1:27933` and run from `backend/`:

```sh
APPLICATION_FEED_LOCAL_TEST=1 node --test tests/applicationActivityFeed.local.test.js
```

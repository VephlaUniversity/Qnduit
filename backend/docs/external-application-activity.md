# External application activity recording

`POST /api/applications/external-activities` requires a Talent Bearer token. Body:

```json
{
  "jobId": "24-character MongoDB job ID",
  "source": "employer",
  "intentId": "fresh UUID v4 for this activation",
  "expectedDestination": "https://example.invalid/apply?ref=a%2Bb"
}
```

Source must explicitly be `employer` or `admin`. No client Talent/poster IDs or timestamps are accepted. Talent comes from authentication; poster and exact destination come from the selected job collection. The expected destination is compared byte-for-byte with the existing validator's destination string. Query strings, percent encoding and fragments are preserved; the server never requests the destination URL.

Each deliberate activation needs a fresh intent UUID. Reuse that UUID and payload for every retry, including lost acknowledgements. A new record returns 201; an identical replay returns 200 with `replayed: true`; conflicting reuse or a changed destination returns 409 with distinct codes. Matching stored intents are replayed before checking later job edits/deletion. Activity records describe a click, never completion of an external application. `clickedAt` is the server recording time, not a client-asserted click time.

## Explicit provisioning and readiness

The collection disables automatic creation/indexing. Before enabling a caller, an operator must explicitly set `EXTERNAL_ACTIVITY_DATABASE_URI` to the intended database and run from `backend/`:

```sh
node src/scripts/provisionExternalApplicationActivity.js
```

The command loads no `.env`, starts no application/providers, creates only this collection and its declared indexes, and never drops indexes. Provisioning fails if existing duplicates or incompatible index definitions prevent creation. Resolve such data separately; do not remove uniqueness protection to enable recording.

Required protection is the nonpartial, nonsparse unique `external_activity_talent_intent_unique` index on `{ talentId: 1, intentId: 1 }` with simple collation. A second index supports Talent/time history reads. The additive `external_activity_source_time` index on `{ source: 1, clickedAt: -1, _id: -1 }` supports Admin activity reads. Rerun the same provisioning command before deploying the Admin view; it creates declared indexes without dropping any. Recording readiness still requires only the existing unique intent protection. Every recording request verifies the required unique index without caching; missing collection, unavailable index inspection, or missing/incompatible protection returns 503 `EXTERNAL_ACTIVITY_NOT_READY` before any insert. Provisioning/readiness failures must be resolved before enabling recording. Operators must not drop or alter this index while callers are active; readiness inspection and insert are separate operations.

The record also has a deterministic SHA-256 string `_id` derived from Talent/intent. MongoDB's built-in primary-key uniqueness protects concurrent in-flight requests even if the compound index is removed between inspection and insert. It does not bypass the readiness gate for subsequent requests.

Availability uses the existing published/strictly-nondeleted/Lagos-deadline predicate plus External configuration validation at the server's read. This does not introduce a global account/profile visibility policy or serialize recording against simultaneous job edits.

No internal application, applicant count, notification or existing `/my-applications` endpoint is changed. External Apply navigation records activity before redirecting, with sign-in continuation and same-intent Retry. My Applied uses the separate paginated combined activity feed with type tabs, search/source filters and retained snapshots. Dashboard counts and Internal Applied detection continue using the existing Internal-only history.

## Isolated tests

Start a disposable MongoDB bound only to `127.0.0.1:27933`, then run:

```sh
EXTERNAL_ACTIVITY_LOCAL_TEST=1 node --test tests/externalApplicationActivity.local.test.js
```

The opt-in test uses a unique disposable database, local HTTP, synthetic records, and no `.env` or provider startup. It drops only its own database afterward.

## Admin audit view

`GET /api/admin/posted-jobs/external-activities` requires an active Admin Bearer session. Query: `q` (literal search, max 200), optional `jobId`, `page` (1–100000), `limit` (1–50, default 20). Source is fixed to `admin`; client source/owner parameters are rejected. Search and job filtering precede pagination; ordering is `clickedAt DESC, _id DESC`. The response includes only activity ID/source/time/exact destination, Talent ID/current name or unavailable fallback, and job ID/recorded title/company/unavailable flag. Removed records do not remove audit events. No Internal applications or counts are included. Open/Copy are ordinary read actions.

Deploy additively: provision the declared indexes with the explicit intended database URI, deploy the backend read endpoint, then deploy the Admin UI. No new recording-readiness requirement or tracking collection is introduced.

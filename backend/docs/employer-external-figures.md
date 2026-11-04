# Employer External figures

`GET /api/jobs/my-jobs` adds `externalTalents` (distinct recorded Talent IDs) and `externalClicks` (all recorded events) to each listed job, with zero defaults. One batch aggregation handles the listed IDs; it never issues one query per job. Existing `applicantsCount` and Most Applicants sorting remain Internal-only. Historical activity is still shown if a listed job later changes application method.

`GET /api/applications/employer?summaryOnly=true` adds the same two numeric fields to the existing summary. Dashboard `externalTalents` is distinct across the entire authenticated Employer's event history, not a sum of per-job distinct counts. All historical events count even if their job is hard/soft deleted, closed or edited. Internal `totalApplications`, `reviewedApplications`, archive behavior and applicant-list output are unchanged. External figures are not application completion claims.

Both aggregates first match `posterId` from authentication, `posterType: Employer`, `source: employer`. Client owner/source IDs cannot widen this boundary. The per-job aggregate additionally matches the server-selected listed job IDs. No current job join is needed for dashboard ownership. Only counts (and job ID for the batch map) leave aggregation; Talent IDs, event snapshots, intents and recorded destinations are never exposed through the new fields. Existing job configuration fields in My Jobs remain unchanged. Both HTTP responses set `Cache-Control: private, no-store`. Failures fail the request instead of manufacturing authoritative zero figures.

My Jobs retains its owner-scoped 15-second visible/online polling. The dashboard summary uses the same nonoverlapping polling helper, with focus/online wake, hidden/offline suspension, cancellation, 60-second failure backoff and shared rate-limit handling. `/api/applications/employer` is classified as an Employer polling read in the shared policy. Account/token changes remount private dashboard state and cancel in-flight summary, chart and independent-stat reads. Successful previous summary figures remain visible during temporary refresh errors, with retry feedback; an initial error displays a dash rather than zero. Existing Internal mutations wake the summary refresh. No new dashboard page, date filter, Talent/Admin analytics or recording behavior is included.

## Index evidence and additive provisioning

The declared nonunique `external_activity_employer_figures` index is `{posterId:1, posterType:1, source:1, jobId:1, talentId:1}`. In synthetic automatic-plan executionStats over 20,000 events / 40 owners, existing indexes scanned 18,000 documents/keys for each owner query. With this candidate, the dashboard scanned 450 covered keys / zero documents; a ten-job batch scanned 90 covered keys / zero documents. These figures reflect this synthetic distribution, not a production guarantee. Counting lifetime history still scales with the owner's matching events and distinct grouping keys.

The existing explicit provisioning script creates this declared index additively when an operator later runs it against an explicitly selected database. It has not been run against production. Automatic index/collection creation stays disabled; recording readiness still checks only the existing unique intent protection. The new read index is not a new recording-readiness gate. Never drop/reconcile existing indexes as part of this change.

## Isolated validation

With disposable MongoDB at `127.0.0.1:27933`, run from repository root:

```
EMPLOYER_EXTERNAL_ACTIVITY_LOCAL_TEST=1 node --test backend/tests/employerExternalActivity.local.test.js
EMPLOYER_EXTERNAL_EXPLAIN_LOCAL_TEST=1 node --test backend/tests/employerExternalActivity.explain.local.test.js
```

Both use uniquely named disposable synthetic databases and no `.env`, production server or provider startup. The explain test excludes the new declared index for its baseline, creates the candidate only in its disposable database, then removes that database. API coverage includes authentication, repeated events, per-job versus global distinctness, cross-source/poster-type ownership collisions, removed jobs, zero figures, unchanged Internal data/events and failed aggregates.

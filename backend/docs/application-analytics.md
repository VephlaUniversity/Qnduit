# EN500A remaining analytics (Step 3)

## Talent Dashboard

The existing `GET /api/applications/my-applications?summaryOnly=true` returns only `success`, `totalApplications`, `externalJobGroups`, `externalOpens`. Authentication/role/suspension checks are the existing Talent checks; all matches derive Talent ID from the verified session. Client Talent IDs cannot change scope. Summary-only failure returns 503 instead of partial or fabricated zero figures. The response is private/no-store.

`totalApplications` counts Internal records in both Employer and Admin application collections, including retained historical rows; the visible label is **Internal applications**. `externalJobGroups` counts distinct `{jobId, source}` identities across that Talent's recorded events, matching the My Applied grouping definition. `externalOpens` counts all individual recorded events, including repeat clicks. Both external metrics are lifetime figures across Employer/Admin sources. They do not apply My Applied search/type/source filters, which are controls on a different page. Jobs need not still exist or remain open; summaries do not join current jobs or invent snapshots. No dates are inferred from clicks beyond server-recorded event time.

The default `my-applications` response is unchanged and stays Internal-only. Existing Applied detection, recent Internal applications, status presentation and profile-view chart/UTC bucket meanings are preserved. Summary reads do not change any event/application/counter or emit notifications. The Talent dashboard uses actor/token-keyed private component state and the existing 15-second visible/online polling lifecycle, focus/reconnect wake, cancellation, failure backoff up to 60 seconds, and shared cooldowns. An initial error displays dashes; temporary refresh failures retain the previous authoritative figures with retry feedback. Account switches discard old private state and stale requests.

## Admin-source External activity

The existing `GET /api/admin/posted-jobs/external-activities` adds:

- `summary: { externalTalents, externalClicks }`
- `summaryScope: { source: "admin", q: <trimmed literal search>, jobId: <normalized selected ID or null> }`

The existing active-Admin authorization and fixed `source: admin` boundary remain. This audit is global across Admin-posted jobs, not limited to the signed-in Admin's poster ID; the pre-existing cross-Admin visibility policy is unchanged. Employer-source events are excluded even for colliding job/actor IDs. Individual event projection, exact destinations, deterministic ordering, page size limits, retained snapshots and existing search/job filters remain unchanged.

`externalTalents` is distinct recorded Talent IDs among matching events (including unavailable/deleted Talents). `externalClicks` is the number of matching individual events and equals `pagination.total`. Both use the exact same source/job/search stages as the event list, before page slicing, in the same aggregation facet. Search uses current available Talent names and recorded job/company/destination fields, preserving existing audit semantics. The summary stays the same on another page of the same filtered result. Changing filters changes both totals and rows; an empty result returns 0/0. API job filtering is included in summary scope; no new UI control was added.

The existing view shows the two figures with explicit text that totals cover Admin-source events matching current filters across all pages. It reuses the same polling/backoff lifecycle and its owner-aware Admin client. Filter changes hide the previous filter's figures, cancel stale reads, reset pagination and preserve the existing debounce. Manual refresh remains. Successful refresh updates audit rows and summary together; service failures retain previous figures only for the same owner/filter key. Initial failures expose no fabricated summary. Authentication failures clear audit state. An Admin account change cancels pending reads and hides private figures/events until the existing session-change refresh flow is completed.

## Shared definitions, polling and performance

`externalActivityCountStages` supplies distinct-identity/event-count grouping for Talent, Admin and existing Employer figures. The Employer pipeline still has the same grouping identities, bucket, projection and ownership match; its existing regression/index tests cover this extraction. No tracking collection or recording/idempotency change is included.

Talent history/summary and Admin audit paths are classified in the shared polling policy. The client polling guard selects the session matching each request's Bearer token, allowing separate regular-user and Admin sessions to coexist. Old requests are cancelled independently by actor/token, so switching Admin cannot cancel an unrelated Talent session or accept the old Admin's result. Shared account/IP 429 cooldowns continue to gate unsent refreshes; no mutation is queued or replayed. Existing server active-role authorization remains authoritative.

Step 3 adds no index or provisioning requirement. External owner/source reads reuse declared indexes; lifetime grouping still reads matching events. Admin literal search and exact filtered totals require processing matching source history and joins before pagination. Talent Internal counts retain the legacy application collections' indexing limitations (Employer application schema does not currently declare an applicant-leading history index). Production sizing was not measured; no production database/provider was accessed. The existing additive Employer read index from Step 2 and unique recording readiness protection remain unchanged.

## Isolated checks

With disposable MongoDB at 127.0.0.1:27933:

```
APPLICATION_FEED_LOCAL_TEST=1 ADMIN_EXTERNAL_ACTIVITY_LOCAL_TEST=1 node --test --test-concurrency=1 backend/tests/applicationActivityFeed.local.test.js backend/tests/adminExternalActivity.local.test.js
node --test src/components/utils/pollingCooldown.test.js
```

The API tests use unique disposable synthetic databases. Coverage includes summary totals, source/owner isolation, current filter versus page scope, fresh events, empty/missing collections, errors, retained history and Internal/event immutability. Additional browser checks cover live refresh, simultaneous Talent/Admin sessions, empty/error/recovery states, stale account responses and responsive layout.

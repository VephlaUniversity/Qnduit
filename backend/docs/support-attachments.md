# Support reply screenshots (EN499B)

Support accepts text-only replies and up to five JPG/JPEG/PNG screenshots per reply,
10,000,000 bytes per file and 25,000,000 bytes total. Multipart requests use
`message`, `clientReplyId` (16–128 URL-safe letters/digits/underscore/hyphen), and
repeated `attachments` file parts. JSON text-only requests can use the same key.
Existing text-only clients without keys remain compatible; retry deduplication
requires a stable key. Text is limited to 10,000 characters. File-only replies
are allowed. Validation uses the shared bounded structural image validator plus
extension, count, per-file, total-file and request limits. This is not antivirus
scanning or a full image decoder.

User and Admin reply endpoints are unchanged. Downloads/previews use
`GET /api/support/tickets/:ticketId/replies/:replyId/attachments/:attachmentId`
(`?view=1` for inline content disposition). Every request checks the authenticated
account and ticket ownership or active Admin authorization. Employer messaging
subscriptions are not consulted. Suspended owners retain their narrow Support
access. Email-only legacy tickets are not assigned ownership. Legacy replies and
stored dates are never normalized or replaced.

Responses expose attachment `id`, `name`, `mime` and `size` only. Storage keys,
checksums and internal request keys are excluded, including mutation responses.
The shared user/Admin composer uses a keyboard-accessible Choose files button,
a hidden input with an explicit JPG/JPEG/PNG allowlist, and one wrapping row of
selected filename chips with per-file removal. Limits appear as errors rather
than persistent help text.

The UI fetches bytes with authentication and creates temporary blob previews;
provider URLs are never sent to the browser.

## Persistence and retries

`SupportReplyOperation` uses its default unique `_id` index to reserve a hash of
(ticket, authenticated actor ID/role, client reply key). No additional index
provisioning or TTL is needed. The fingerprint includes trimmed text and each
validated file's canonical name, type, size and SHA-256. A replay with different
content is rejected. Provider uploads occur only after the operation is claimed with majority write
concern.
The reply is atomically appended with an embedded request-key guard, preserving
all other replies and status. New browser composers preserve the exact request
key/text/File snapshot through refresh, close and reopen in the same page
session. They lock editing after an unconfirmed send and offer a safe retry.
A deliberate new reply uses a new key; identical content is not globally deduped.

Confirmed pre-commit failures discard only that attempt's uploads. Successful or
independently confirmed (majority-read) appends remove temporary staging but retain assets.
Unknown upload or database outcomes retain their assets, intent files and
operation records. An absent read is never treated as proof that an in-flight
write failed. Concurrent/pending retries do not upload again; a retry can confirm
a stored reply and remove its staging. A confirmed failed operation can be
reclaimed only after its assets were discarded. Unresolved operations require
explicit reconciliation; there is no timeout lease or automatic destructive
cleanup. Never delete an uncertain operation to unblock a retry. Support assets
are not processed by the direct-message recovery worker. Ticket deletion does
not automatically delete previously committed screenshot assets.

## Provider configuration and verification boundary

Disabled by default. Live operation requires `SUPPORT_ATTACHMENTS_ENABLED=true`,
`SUPPORT_ATTACHMENT_STORAGE=cloudinary`, `SUPPORT_ATTACHMENT_DIR` set to a private
absolute directory outside the app, and the existing Cloudinary credentials.
The Support staging directory must be separate from (and not nested inside or
around) the messaging staging directory. Preserve staging and operation records
across restarts. Storage reuses the authenticated raw-asset/private-download
primitives with server-side streaming and redirects disabled.

EN499B tests use a loopback-only database and mocked provider transport. Actual
Cloudinary upload/download, provider permissions, durable deployment staging and
reconciliation of interrupted live operations remain unverified. No production
or provider requests were performed.

## Focused checks

With the dedicated synthetic MongoDB listening on `127.0.0.1:27941`:

```
QNDUIT_EN499B_ATTACHMENTS_LOCAL_TEST=1 node --test backend/tests/supportAttachments.local.test.js
QNDUIT_EN499B_SUPPORT_LOCAL_TEST=1 node --test backend/tests/supportHistory.local.test.js
node --test src/components/utils/supportConversation.test.js
```

The attachment test uses the real staging/intent code and mocks provider
upload/delete/read operations. It covers valid/corrupt JPG/JPEG/PNG files, limits, DTOs,
owner/Admin access, concurrent/committed retries, uncertain outcomes, confirmed
failure cleanup, legacy records, free Employers and suspended owners.

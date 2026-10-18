# Message send idempotency

`POST /api/messages/send` optionally accepts `clientMessageId`: 16–128 ASCII letters, digits, `_` or `-`. The authenticated sender ID and verified sender type scope the key; client sender fields are not accepted.

- First keyed save: 201, `{success:true,message}`.
- Same sender/key and identical recipient ID/type/text: 200, the existing persisted message.
- Different content or recipient using that key: safe 409. Text comparisons are exact, including whitespace.
- Invalid key: safe 400. Other validation/authentication remains intact.
- Calls without a key retain existing behavior and are not deduplicated.

Concurrent inserts rely on MongoDB uniqueness. The controller catches the duplicate-key race and reads the winning document, then verifies its payload. There is no in-memory backend lock or cross-instance guarantee without the index below.

## Explicit production rollout

Message has `autoIndex:false`; deployment does not automatically create this index. No production index was changed during implementation.

Before enabling keyed sends, inspect existing index definitions and audit any existing string keys for duplicate `(sender,senderModel,clientMessageId)` values. Investigate conflicts; do not automatically delete or merge messages. Have the database operator create and verify this index through the normal deployment process:

```javascript
db.messages.createIndex(
  { sender: 1, senderModel: 1, clientMessageId: 1 },
  {
    name: "message_sender_request_unique",
    unique: true,
    partialFilterExpression: { clientMessageId: { $type: "string" } }
  }
)
```

The partial index leaves legacy documents without keys unaffected. Check build capacity, write overhead, index completion and query plans; do not use `syncIndexes()` to drop unrelated indexes. All instances must use the same database and index. Keep the index and persisted keys while retrying clients may still exist; no TTL or key cleanup is introduced.

## Composer retry behavior

The existing Send action retries an uncertain unchanged draft using its original UUID. Different text uses a new logical-send key. Attempt keys and draft revisions are recipient-specific. Text edited while a request is pending is retained, even when it matches the earlier text again. A confirmed POST clears only an unedited sent draft; a subsequent list/transcript refresh failure explicitly reports that the message was saved. Rendered messages deduplicate by persisted ID.

Drafts and retry attempts remain in memory for the mounted Messages component, as before; reload/unmount does not restore them. No automatic retry, session-storage persistence, polling, unread behavior or retry control is added. Sender-side key reuse is necessary: manually re-entering a message after leaving the page creates a new logical send.

Local verification used a partial unique index in the isolated database, discarded-response replay, 12 concurrent retries, payload conflicts, sender isolation, malformed keys and unkeyed compatibility. Intercepted component checks separately covered uncertain retries, draft edits, recipient switches, refresh failures, one rendered message per ID, and existing history/navigation regressions. Real-browser verification awaits the user.

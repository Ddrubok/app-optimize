# Network and server

## Follow one user action

Trace the action through client scheduling, requests, server work, database/external calls, response decoding, and usable UI state. Use existing request/trace IDs where available. Inspect related callers before changing a shared request helper or endpoint.

Record the observations needed to locate the delay: request count, sequencing, transmitted versus decoded bytes, retries/errors, server spans, queries, and client parsing/rendering. A client-observed wait includes more than server execution. Without server evidence, leave internal attribution unresolved. If a trace is sampled, missing spans are not proof that no work happened.

## Match the change to the evidence

| Evidence | Candidate change | What must remain true |
|---|---|---|
| Equivalent requests repeat during one action | Remove duplicate subscriptions or coalesce in-flight reads | Keys include all response-varying inputs and identity; one caller's cancellation must not incorrectly cancel another. Clear settled/failed entries. |
| Independent requests run sequentially on the critical path | Start them together with bounded concurrency, or batch where the API supports it | Preserve ordering, consistency, cancellation, partial-failure behavior, and server capacity. Do not parallelize dependent writes. |
| Responses include unnecessary records or fields | Select needed fields, use stable pagination, or reuse a valid local result | Required fields, ordering, totals, and supported older clients still work. A truncated result is not equivalent work. |
| Transfers dominate the measured delay | Adjust payload/asset encoding, compression, or delivery using existing platform features | Verify byte savings and decoding/CPU cost; preserve image quality, accessibility, and response semantics. |
| Polling or retries create repeated work | Stop obsolete requests; tune polling/backoff to actual freshness needs | Honor cancellation, retry limits and server signals. Non-idempotent operations need safe retry semantics; client debounce alone does not guarantee one payment/save. |
| Repeated expensive reads dominate | Use an existing bounded cache at the appropriate layer | Explicit keys, invalidation, freshness, identity isolation, and miss/failure behavior; verify the measured benefit. |

Choose caching deliberately. A key may need user/tenant, permissions, locale, filters, and version. Check updates, logout/account changes, revocation, eviction, and concurrent misses. Do not add arbitrary TTLs, cache unbounded results, expose one user's data to another, or substitute stale data where correctness requires a fresh decision. Authorization must still be enforced by the server.

For client changes, verify out-of-order responses, navigation away, offline/reconnect, duplicate actions, and loading/error states when the change affects them. Choose relevant cases; do not run a full network matrix for an isolated edit.

Concurrent reads must not publish protected content before required permission or block information succeeds. Discard responses from an obsolete account/session before updating either visible state or shared caches; clearing a cache at logout alone does not prevent a pending response from repopulating it.

## Server and database

Locate actual work before replacing an implementation:

- For N+1 behavior, compare queries for the same result set and inspect a suitable batch/join. Watch for larger intermediate results, memory use, and missing pagination.
- For a slow query, inspect the plan, row estimates, selected columns, indexes, and dataset. An index has write and storage costs; verify the actual query improves.
- For connection waits or CPU pressure, distinguish queueing, locks, computation, and external waits. Increasing pools or concurrency may move or enlarge the bottleneck.
- For shared computation or serialization, remove repeated work at the owning layer. Moving it to the client is a tradeoff to measure, not an automatic win.

`EXPLAIN ANALYZE` executes the statement. Even reads can take locks, consume substantial resources, or call functions with side effects. Use an authorized test dataset and engine-specific safe procedure; use a non-executing plan where appropriate. Do not run a live write merely to measure it. Drafting a migration does not authorize applying it to production.

Preserve API contracts, transactions, validation, authorization, idempotency, and durable completion. Do not remove a server endpoint or field because one client repository has no references: check supported client versions and other consumers. If those cannot be checked, retain compatibility and report the gap. Relevant existing contract tests and affected user journeys must still pass after a change.

## References

- [OpenTelemetry trace structure](https://opentelemetry.io/docs/concepts/signals/traces/)
- [HTTP caching semantics](https://www.rfc-editor.org/rfc/rfc9111.html)
- [PostgreSQL EXPLAIN and execution caveats](https://www.postgresql.org/docs/current/sql-explain.html) (PostgreSQL only; use the actual engine's documentation.)

# Neon and Cloudflare durable infrastructure design

Date: 2026-09-30
Repository: islamismylifebey-web/galor-ai-receptionist
Implementation branch: feat/business-operations-harness-v1
Inspected baseline: 20dbbc415b2be8c90742b6c67cdd7210362f580b
Status: Written design for review; infrastructure is not provisioned or live-qualified.

## Purpose and authorized scope

Make the existing business operations harness durable using Neon and Cloudflare, preserving the receptionist frontend and existing production systems. Customer records, workflow progress, permissions, evidence and scheduled work must survive process restarts. Duplicate delivery must not duplicate consequential actions. Customer data must be isolated independently of model behavior.

The user selected Neon and Cloudflare. This design assumes a dedicated Neon project and separate staging resources; it does not assume access to an existing production database. The first implementation slice is durable infrastructure and an internal-note workflow. It does not activate customer messages, calendar bookings, financial transactions or live agents.

## Provider responsibilities

| Responsibility | Service | Data and boundary |
| --- | --- | --- |
| Authoritative business data | Neon Postgres | Tenant configuration, customer records, service requests, jobs, appointments, estimates, invoices and payment references |
| Workflow durability | Neon Postgres | State, version, pinned definition, action ledger, approvals, events, evidence, outbox, inbox and job status |
| API and workers | Cloudflare Workers | Authenticated ingress, orchestration steps, gateway, queue consumer and outbox dispatcher |
| Database connections | Cloudflare Hyperdrive with pg and Drizzle | Pooling to Neon; disable query caching for authorization and workflow state |
| Work delivery | Cloudflare Queues | Small job-reference envelopes; at-least-once transport, bounded retries and a dead-letter queue |
| Documents and files | Private Cloudflare R2 | Job photos, documents, knowledge files and exports; authorization through Worker |
| Secrets | Worker secrets and protected integration runtime | Database access and vendor secrets stay out of agent context, logs and source control |
| Diagnostics | Worker observability plus durable audit records | Redacted structured logs, correlation IDs and metrics; Neon remains authoritative for action history |

Neon is the source of truth. Queues transport references to durable jobs; R2 holds file bytes. Do not duplicate the relational source of truth in D1 or KV. Add optional services only when measured requirements justify them.

## Baseline evidence and defects

Baseline npm test passed 5/5 and npm run demo reached SCHEDULED with reference-calendar evidence. These are in-memory tests, not proof of durable or live operation.

Read-only probes against the inspected baseline reproduced:

1. A charge in tenant-a followed by the same idempotency key in tenant-b returned tenant-a's execution as EXECUTED.
2. Reusing a charge key with requested amount 999 returned the original amount 309 without rejecting the conflict.
3. Two concurrent identical requests produced two payment transactions.
4. A request for a 2500 charge with approvedBy set to an arbitrary caller-provided string returned EXECUTED.

The existing synchronous EventStore, IdempotencyStore and local workflow object cannot simply be replaced by asynchronous database calls without changing the awaiting and transaction boundaries. The current tests remain reference regression tests; the production runtime must have independent durable and security tests.

## Environments and resource ownership

Use isolated resources named galor-operations-staging for the Worker, work queue, dead-letter queue, private R2 bucket and Hyperdrive configuration. Create a dedicated Neon project when account access permits, then a staging branch for migration and recovery qualification. Production resources must be separate and remain inactive until staging evidence and release gates pass.

Use a migration-owner database role only in the migration job. The application uses a non-owner, non-superuser role without BYPASSRLS. Queue dispatch uses a narrowly scoped service role or function exposing only pending job references across tenants; it cannot read customer content or perform business actions.

No destructive changes to existing resources, migrations against unrelated databases, public R2 URLs, customer contact or production cutover occur in this slice. Resource IDs are discovered and recorded during provisioning, never invented. Keep migrations and Wrangler configuration in GitHub; secrets are injected through approved secret channels.

## Durable schema and tenant isolation

Create a dedicated operations schema using versioned Drizzle migrations.

Initial tables:

- tenants and memberships: business configuration, authenticated membership and disabled flag.
- workflows: tenant_id, workflow_id, workflow_type, definition_version, state, version, bounded input, timestamps.
- events: tenant_id, event_id, workflow_id, actor_id, event_type, sequence, trace_id, causation_id, policy_version, redacted payload, timestamp.
- actions: tenant_id, action_id, workflow_id, idempotency_key, request_digest, action_type, status, provider_key, execution_ref, verification_status, lease/fencing data, timestamps.
- approvals: tenant_id, approval_id, action_id, request_digest, decision, authenticated approver_id, expiry and policy_version.
- evidence: tenant_id, evidence_id, action_id, authoritative_system, observation_ref, expected/observed safe fields, verification timestamp.
- outbox: tenant_id, message_id, workflow_id, job_id, available_at, publishing lease, published_at.
- jobs and inbox: tenant_id, job_id, step, status, attempt_count, next_attempt_at, lease_token, lease_expires_at, deduplication marker and safe failure_code.
- files: tenant_id, file_id, workflow_id, generated object_key, media_type, size, checksum and lifecycle status.
- internal_notes: tenant_id, note_id, workflow_id and authorized note content for the first runnable durable action.

Domain records follow as typed tables for customers/contacts, conversations/messages, leads/service requests, estimates/line items, appointments/jobs, invoices/payment references, campaigns and knowledge metadata. Define required fields, retention and indexes when each actual workflow is implemented. The initial migration does not claim all business flows are operational.

Every tenant table has tenant_id NOT NULL, tenant-qualified keys and foreign keys. Actions enforce UNIQUE(tenant_id, idempotency_key); jobs enforce tenant-qualified deduplication. Apply ENABLE and FORCE ROW LEVEL SECURITY with both USING and WITH CHECK. Fail closed when transaction tenant context is missing.

Resolve tenant identity from verified authentication and database membership, never customer text, an arbitrary request header or body. Establish transaction-local tenant context using parameterized SQL on the same database client. Reset through transaction completion; never use pooled session-wide SET. Database role and RLS configuration are tested on actual Postgres, not inferred from mocks.

RLS protects against query mistakes; it does not make a compromised privileged service safe. The service that resolves authentication and sets tenant context remains trusted and narrowly scoped.

## Workflow and event commit boundary

Pin workflow and policy versions at creation. A step transaction locks the workflow, checks its expected version and permitted transition, records step output, appends its event and inserts the next durable job/outbox record atomically. A stale worker cannot overwrite newer state.

Perform model calls and external API calls outside long-running database transactions. Persist their inputs and bounded intent before dispatch. Use step IDs and version checks when committing results. Recovery resumes an existing workflow from persisted state, rather than recreating it as NEW or rerunning completed actions.

Scheduled follow-ups use outbox available_at in Postgres. A scheduled Worker dispatches due records in bounded batches; it does not rely on an agent remembering a timer or on unlimited queue delay.

## Action gateway and idempotency

Order: authenticated identity -> schema and scope -> agent permission -> current tenant policy and kill switch -> trusted approval -> durable reservation -> bounded executor -> authoritative reread -> durable evidence/result/audit.

Normalize action inputs and generate a deterministic digest covering tenant, action type, target, workflow and all consequential inputs. Reject different input with the same tenant/key as IDEMPOTENCY_CONFLICT. Never return another tenant's result.

Atomically reserve the action using the tenant-qualified unique key. Concurrent losers observe an existing action, never invoke the executor. Track RESERVED, EXECUTING, EXECUTED, UNVERIFIED, RECONCILIATION_REQUIRED, DENIED and FAILED outcomes. Denials must not consume a key intended for a subsequently authorized action.

Provider mutations use the same persisted provider idempotency key on every retry, where supported. A database reservation alone cannot guarantee exactly-once external execution after a crash. On timeout or a lost response, retain uncertain status and query the provider by its stable reference/key before retrying. Providers without safe idempotency or reconciliation are disabled for autonomous mutations.

Recheck current authorization before revealing a replayed result. Bind approvals to tenant, action and digest, with expiry and an authenticated authorized approver. Ignore approvedBy supplied by the agent or customer as an authorization source.

Verification compares observed tenant/ownership, customer, target, time/status, or invoice/amount/currency as applicable. Success requires authoritative readback and a committed evidence reference. A failed verification must not trigger another blind charge or booking.

The first durable executor creates an internal note in Postgres and rereads it under tenant scope. Calendar and payment adapters remain explicit test doubles and are not installed as production executors.

## Queue, retry and dead-letter recovery

Persist next work and outbox records in the same transaction as state. The dispatcher leases due outbox rows, sends envelopes containing tenant_id, job_id, workflow_id, message_id and trace_id, then records publication. A crash between send and publication may deliver duplicates; inbox/job deduplication handles them.

Consumers validate the envelope, load the authoritative job, establish tenant scope and atomically acquire a lease with a fencing token. Persist completion before acknowledgment. Expired workers cannot commit. Long-running model work must use bounded execution with lease renewal or a separate suitable runtime; do not assume arbitrary Worker execution duration.

Retry only classified transient failures, using capped exponential backoff with jitter. Persist attempts and next_attempt_at. Invalid schema, authorization denials and policy violations terminate or escalate immediately. Payments declined enter a business state. Unknown external outcomes enter reconciliation.

Configure a transport DLQ as well as durable job DEAD_LETTER state. Recovery reconciles them and creates an operator case; no failure silently disappears. Replay requires an authorized operator, preserves the same action/provider key and records why it was resumed.

## Files, secrets and observability

R2 stays private. Generate object keys server-side under tenant-scoped prefixes and store metadata in Postgres. Authorize every upload/download through verified membership and a tenant-scoped metadata lookup. A prefix is organizational, not sufficient authorization. Enforce bounded size, permitted media types and checksum verification.

Track PENDING_UPLOAD and READY metadata so crashes or orphaned objects can be reconciled. Retention/deletion runs are policy-governed and distinct from upload workflows. No call recordings are enabled by this infrastructure change.

Agent context receives integration references rather than secret values. Mask PII in diagnostics. Store provider IDs and verification fields, not raw credentials, card details or unrestricted request bodies. Use correlation IDs across API, job, action, evidence and events.

The application role cannot update/delete audit events. Append-only application permissions are not a claim of tamper-proof storage against administrators; stronger archival requirements need a separately qualified retention design.

## API and first acceptance journey

Staging exposes authenticated workflow creation and tenant-scoped workflow/event reads, plus a health endpoint containing no sensitive configuration. Administrative approval, replay and kill-switch operations require separate verified role checks.

First journey: authenticated staging request -> create workflow -> atomic event/outbox -> queue delivery -> authorized internal note -> readback verification -> persisted completion -> tenant-scoped result.

Run this with synthetic tenants and data. Restart the worker and reread the same workflow/evidence. Duplicate and concurrently redeliver the same envelope. Prove one internal note, one completed step and no tenant leakage. Keep all customer-facing vendor mutations disabled.

## Verification and release gates

Required tests before the new durable runtime is described as complete:

- Existing five tests and reference demo still pass.
- Drizzle migration applies cleanly to an isolated Postgres database; real restricted-role RLS blocks cross-tenant reads, writes and foreign-key references.
- Missing tenant context is denied; caller-provided tenant/approval claims are rejected.
- Same key in different tenants is isolated; changed payload conflicts; simultaneous duplicate actions produce one result.
- A stale workflow version and an invalid transition are rejected.
- Event/state/outbox changes roll back together on transaction failure.
- Crash before publication, after send, before acknowledgment and after completion recovers without duplicating a durable note.
- Expired leases are recoverable; stale fencing tokens cannot commit.
- Retry classes, budget exhaustion, DLQ and authorized replay preserve action identity.
- File reads cannot cross tenant scope; object access stays private.
- Logs and contexts contain no secret values.
- Worker bundle and Wrangler configuration validate; staging synthetic test proves Neon, Queue and R2 read/write through the actual deployed runtime.
- Restore a backup/branch and verify workflow/evidence/file consistency before selecting production recovery targets.

Tests using mocks can verify adapter calls but cannot replace live Postgres/RLS, Cloudflare delivery or restart/restore tests. Record commit, migration version, provider resource IDs, synthetic workflow IDs and redacted evidence for each live gate.

After staging: shadow observation -> bounded reversible operation -> qualified operational adapters -> canary -> broader activation. Existing receptionist routes remain in place until an explicit cutover. Roll back application versions using compatible expand/contract migrations; do not discard ledger or workflow history.

## Current access and decisions still required

Observed in this session: Neon tools are available, but describe_project without project_id returns INVALID_ARGUMENT because the connection is unscoped. This tool surface provides no list/create-project capability, and no Neon/Cloudflare credentials are present in the execution environment. Cloudflare plugin discovery returned no matching plugin.

Needed for provisioning: a dedicated Neon project ID and authorized access, plus a Cloudflare account and authorized deployment connection. Secret values must not be pasted into chat. Provisioning capacity, region and account limits will be checked once access exists.

This is an architectural change. The Superpowers brainstorming workflow requires written-spec review before implementation planning. The user selected the provider approach; this document is the concrete specification for that review. No new infrastructure has been provisioned, and no production-readiness claim is made.

## Official references checked

- Cloudflare Queues delivery guarantees: https://developers.cloudflare.com/queues/reference/delivery-guarantees/
- Hyperdrive node-postgres integration: https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-drivers-and-libraries/node-postgres/
- R2 Workers API: https://developers.cloudflare.com/r2/api/workers/workers-api-reference/
- Neon connection methods: https://neon.com/docs/connect/choose-connection
- Neon branching: https://neon.com/docs/introduction/branching

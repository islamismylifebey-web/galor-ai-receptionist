# Architecture

## Ten-machine harness

1. Experience machine — phone, SMS, email, web and app entrypoints.
2. Orchestration machine — workflows, states, events, queues.
3. Intelligence machine — agents, model routing, context packaging.
4. Action machine — bounded tools, normalized adapters, action gateway.
5. Governance machine — policies, permissions, approvals and risk levels.
6. Data machine — tenant data, CRM, jobs, payments, knowledge and memory.
7. Verification machine — observed-state checks and evidence.
8. Reliability machine — idempotency, retry, DLQ, circuit breaking and recovery.
9. Observability machine — logs, metrics, traces, audits and incidents.
10. Release machine — tests, staging, canaries and rollback.

## Agent topology

Business workers: Intake, Qualification, Customer Identity, Routing, Scheduling, Estimate, Follow-up, Job Preparation, Completion, Billing, Reputation, Retention, Business Intelligence.

System oversight: Supervisor and Independent Verifier.

## Production boundary

Agents do not call consequential vendor APIs directly.

```
agent -> action request -> gateway -> permission -> policy -> idempotency
      -> bounded adapter -> observed-state verification -> evidence -> audit
```

If verification fails, the action is not represented as successful.

## Multi-tenancy

Every durable record, event, workflow, credential reference, queue item, context request and action request must carry tenant identity. Production persistence must enforce tenant isolation independently of model behavior.

## Secrets

Secrets remain server-side inside a secret manager or integration runtime. Agent contexts receive credential references, never raw secret values.

## Prompt-injection posture

Customer messages, email, web pages, uploaded documents and retrieved text are untrusted data. They cannot grant permissions or override system policy.

## Production persistence interfaces

The v1 code intentionally uses in-memory adapters for executable tests. Replace them behind the existing boundaries:

- EventStore -> append-only durable event/audit store
- IdempotencyStore -> transactional durable store
- WorkQueue -> durable queue/workflow engine
- Calendar -> Google/Microsoft/vendor adapter
- Payments -> Stripe/vendor adapter
- customer/job data -> relational database with tenant RLS
- observability -> OpenTelemetry-compatible backend

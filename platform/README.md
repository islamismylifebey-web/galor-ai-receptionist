# GALOR Business Operations Harness v1

This directory is the production-control foundation behind the existing receptionist.

The receptionist remains an experience layer. This harness owns workflow state, authorization, actions, verification, evidence, retries, and auditability.

## Core rule

AI may reason. Deterministic software owns consequential state changes.

An agent may propose an appointment, charge, refund, message, or record mutation. The action gateway decides whether the action is permitted, executes it through a bounded adapter, verifies the external result, and writes evidence.

## Included in v1

- bounded business-agent contracts
- explicit workflow state machine
- tenant policy engine
- least-privilege action permissions
- action risk levels
- idempotency guard
- action gateway
- verification engine
- immutable-style event/audit store
- retry queue and dead-letter queue
- context packager
- in-memory calendar and payment adapters
- reference orchestrator for new-service leads
- golden-path and security tests
- CI gate

## Not represented as production-complete yet

The included adapters are deliberately in-memory reference adapters. Before live operation, replace them with durable infrastructure and vendor adapters (Postgres, Redis/SQS/Temporal-class queueing, Twilio, Stripe, Google/Microsoft calendar, CRM/accounting connectors, secrets manager, telemetry backend).

No secret values belong in agent context.

## Run

```bash
cd platform
npm test
npm run demo
```

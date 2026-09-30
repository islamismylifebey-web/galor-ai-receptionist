# Business Operations Harness

The existing receptionist remains intact.

The first production-control implementation for the broader business automation platform lives in [platform/](platform/README.md).

Current scope implements the safety and reliability spine first: contracts, state, permissions, policy, action gating, idempotency, verification, audit events, retry/DLQ, a reference orchestrator, and automated tests.

This is intentionally developed on a feature branch and must pass CI before merge.

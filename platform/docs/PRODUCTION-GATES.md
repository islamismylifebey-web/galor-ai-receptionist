# Production gates

A release is not production-qualified merely because agent output looks correct.

Required gate sequence:

1. build and syntax validation
2. deterministic unit tests
3. state-machine transition tests
4. agent-contract/schema tests
5. least-privilege tests
6. policy/approval tests
7. idempotency and replay tests
8. integration contract tests
9. golden workflow suite
10. adversarial/prompt-injection suite
11. failure/retry/DLQ tests
12. tenant-isolation tests
13. staging synthetic transactions
14. shadow mode
15. bounded live mode
16. canary rollout
17. automatic rollback thresholds
18. post-deploy synthetic verification

## Operational controls required before live customer use

Durable database and queue, secrets manager, centralized telemetry, incident alerting, per-tenant/agent/messaging/payment kill switches, tested backup/restore, vendor circuit breakers, rate limits, loop detection, budget governor, model fallback policy, and data retention/privacy controls.

## Evidence rule

Every material success claim must resolve to observed evidence from the authoritative system. A calendar write is successful only when the created event can be read back with the expected time and status.

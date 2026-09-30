import test from "node:test";
import assert from "node:assert/strict";
import { createRuntime } from "../src/runtime.js";
import { WorkQueue } from "../src/queue.js";

test("least privilege blocks Intake Agent from payment execution", async () => {
  const runtime = createRuntime();
  const result = await runtime.gateway.execute({
    tenantId: "hvac-1",
    workflowId: "wf-security",
    agentId: "INTAKE",
    action: "CHARGE",
    idempotencyKey: "attack-charge-1",
    input: { invoiceId: "x", amount: 1, consent: true }
  });

  assert.equal(result.status, "DENIED");
  assert.equal(result.reason, "AGENT_PERMISSION_DENIED");
  assert.equal(runtime.payments.transactions.size, 0);
});

test("large charge requires human approval", async () => {
  const runtime = createRuntime();
  const result = await runtime.gateway.execute({
    tenantId: "hvac-1",
    workflowId: "wf-approval",
    agentId: "BILLING",
    action: "CHARGE",
    idempotencyKey: "charge-large",
    input: { invoiceId: "big", amount: 2500, consent: true }
  });

  assert.equal(result.status, "APPROVAL_REQUIRED");
  assert.equal(runtime.payments.transactions.size, 0);
});

test("retry exhaustion lands job in dead-letter queue", async () => {
  const queue = new WorkQueue({ maxAttempts: 3 });
  queue.enqueue({ id: "job-1" });
  const result = await queue.drain(async () => { throw new Error("provider down"); });

  assert.equal(result.deadLetters.length, 1);
  assert.equal(result.deadLetters[0].attempts, 3);
});

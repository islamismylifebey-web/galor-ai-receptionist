import test from "node:test";
import assert from "node:assert/strict";
import { createRuntime } from "../src/runtime.js";
import { Orchestrator } from "../src/orchestrator.js";

test("GOLD-001 new HVAC repair lead reaches verified SCHEDULED state", async () => {
  const runtime = createRuntime();
  const orchestrator = new Orchestrator({ runtime });

  const result = await orchestrator.runNewLead({
    tenantId: "hvac-1",
    name: "Bey Test",
    phone: "+13095550101",
    service: "AC not cooling",
    preferredSlot: "2026-10-01T10:00:00-05:00"
  });

  assert.equal(result.workflow.state, "SCHEDULED");
  assert.equal(result.action.status, "EXECUTED");
  assert.equal(result.action.verification.verified, true);
  assert.ok(result.action.verification.evidence.eventId);
});

test("GOLD-004 duplicate charge idempotency key produces one transaction", async () => {
  const runtime = createRuntime();
  const request = {
    tenantId: "hvac-1",
    workflowId: "wf-pay",
    agentId: "BILLING",
    action: "CHARGE",
    idempotencyKey: "charge:invoice-42:v1",
    input: { invoiceId: "invoice-42", amount: 309, consent: true }
  };

  const first = await runtime.gateway.execute(request);
  const second = await runtime.gateway.execute(request);

  assert.equal(first.status, "EXECUTED");
  assert.equal(second.status, "EXECUTED");
  assert.equal(second.deduplicated, true);
  assert.equal(first.execution.transactionId, second.execution.transactionId);
  assert.equal(runtime.payments.transactions.size, 1);
});

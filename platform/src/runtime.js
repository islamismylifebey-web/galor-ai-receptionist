import { AGENT_CONTRACTS } from "./contracts.js";
import { EventStore } from "./event-store.js";
import { IdempotencyStore } from "./idempotency-store.js";
import { PolicyEngine } from "./policy-engine.js";
import { VerificationEngine } from "./verification-engine.js";
import { ActionGateway } from "./action-gateway.js";
import { InMemoryCalendar } from "./integrations/in-memory-calendar.js";
import { InMemoryPayments } from "./integrations/in-memory-payments.js";

export function createRuntime({ policyByTenant = {} } = {}) {
  const eventStore = new EventStore();
  const idempotencyStore = new IdempotencyStore();
  const policyEngine = new PolicyEngine(policyByTenant);
  const calendar = new InMemoryCalendar();
  const payments = new InMemoryPayments();

  const verificationEngine = new VerificationEngine({
    CALENDAR_CREATE: async (execution) => {
      const observed = await calendar.get(execution.eventId);
      return {
        verified: Boolean(observed && observed.status === "CONFIRMED" && observed.start === execution.start),
        evidence: observed ? { eventId: observed.eventId, status: observed.status, start: observed.start } : null
      };
    },
    CHARGE: async (execution) => {
      const observed = await payments.get(execution.transactionId);
      return {
        verified: Boolean(observed && observed.status === "SUCCEEDED" && observed.amount === execution.amount),
        evidence: observed ? { transactionId: observed.transactionId, status: observed.status, amount: observed.amount } : null
      };
    },
    INTERNAL_NOTE_CREATE: async (execution) => ({ verified: Boolean(execution.noteId), evidence: { noteId: execution.noteId } })
  });

  let noteSequence = 0;
  const executors = {
    CALENDAR_CREATE: async (input, request) => calendar.create({ ...input, tenantId: request.tenantId }),
    CHARGE: async (input, request) => payments.charge({ ...input, tenantId: request.tenantId }),
    INTERNAL_NOTE_CREATE: async (input) => ({ noteId: `note-${++noteSequence}`, body: input.body ?? "" })
  };

  const gateway = new ActionGateway({
    contracts: AGENT_CONTRACTS,
    policyEngine,
    idempotencyStore,
    verificationEngine,
    eventStore,
    executors
  });

  return { eventStore, idempotencyStore, policyEngine, verificationEngine, gateway, calendar, payments };
}

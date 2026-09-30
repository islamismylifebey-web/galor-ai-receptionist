import { ACTIONS } from "./contracts.js";

function validateRequest(request) {
  if (!request.tenantId) throw new Error("tenantId required");
  if (!request.agentId) throw new Error("agentId required");
  if (!request.action) throw new Error("action required");
  if (!ACTIONS[request.action]) throw new Error("unknown action");
  if (ACTIONS[request.action].mutating && !request.idempotencyKey) throw new Error("idempotencyKey required");
}

export class ActionGateway {
  constructor({ contracts, policyEngine, idempotencyStore, verificationEngine, eventStore, executors }) {
    Object.assign(this, { contracts, policyEngine, idempotencyStore, verificationEngine, eventStore, executors });
  }
  async execute(request) {
    validateRequest(request);
    const contract = this.contracts[request.agentId];
    if (!contract) throw new Error("unknown agent");
    if (!contract.actions.includes(request.action)) return this.#record(request, { status: "DENIED", reason: "AGENT_PERMISSION_DENIED" });

    const existing = request.idempotencyKey && this.idempotencyStore.get(request.idempotencyKey);
    if (existing) return { ...existing, deduplicated: true };

    const policy = this.policyEngine.authorize(request);
    if (!policy.allowed) {
      return this.#record(request, {
        status: policy.approvalRequired ? "APPROVAL_REQUIRED" : "DENIED",
        reason: policy.reason
      });
    }

    const executor = this.executors[request.action];
    if (!executor) return this.#record(request, { status: "FAILED", reason: "NO_EXECUTOR_REGISTERED" });

    const execution = await executor(request.input ?? {}, request);
    const verification = await this.verificationEngine.verify(request.action, execution, request);
    if (!verification.verified) return this.#record(request, { status: "UNVERIFIED", reason: verification.reason, execution, verification });

    const committed = { status: "EXECUTED", action: request.action, execution, verification, risk: ACTIONS[request.action].risk };
    if (request.idempotencyKey) this.idempotencyStore.commit(request.idempotencyKey, committed);
    return this.#record(request, committed);
  }
  #record(request, outcome) {
    this.eventStore.append({
      eventType: "ACTION_GATEWAY_RESULT",
      tenantId: request.tenantId,
      workflowId: request.workflowId,
      actor: request.agentId,
      action: request.action,
      risk: ACTIONS[request.action]?.risk,
      outcome
    });
    return outcome;
  }
}

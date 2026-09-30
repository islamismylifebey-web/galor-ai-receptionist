import { randomUUID } from "node:crypto";
import { StateMachine } from "./state-machine.js";
import { referenceAgents } from "./agents.js";

export class Orchestrator {
  constructor({ runtime, agents = referenceAgents }) {
    this.runtime = runtime;
    this.agents = agents;
    this.stateMachine = new StateMachine();
  }

  async runNewLead(input) {
    const workflowId = input.workflowId ?? randomUUID();
    let workflow = { workflowId, tenantId: input.tenantId, state: "NEW", version: 1 };

    this.runtime.eventStore.append({
      eventType: "LEAD_RECEIVED", tenantId: input.tenantId, workflowId, actor: "SYSTEM",
      source: input.channel ?? "TEST", payload: { name: input.name, service: input.service }
    });

    const intake = await this.agents.INTAKE.run(input);
    workflow = this.#move(workflow, "IDENTIFIED", "INTAKE_COMPLETED", intake);
    workflow = this.#move(workflow, "QUALIFYING", "QUALIFICATION_STARTED", {});

    const qualification = await this.agents.QUALIFICATION.run(input);
    if (qualification.status !== "QUALIFIED") {
      workflow = this.#move(workflow, "WAITING_CUSTOMER", "QUALIFICATION_INCOMPLETE", qualification);
      return { workflow, intake, qualification };
    }

    workflow = this.#move(workflow, "QUALIFIED", "QUALIFICATION_COMPLETED", qualification);
    const routing = await this.agents.ROUTING.run({ service: input.service });

    if (routing.requiresHuman) {
      workflow = this.#move(workflow, "ESCALATED", "HUMAN_ESCALATION_REQUIRED", routing);
      return { workflow, intake, qualification, routing };
    }

    workflow = this.#move(workflow, "SCHEDULING", "SCHEDULING_STARTED", routing);
    const scheduling = await this.agents.SCHEDULING.run({
      preferredSlot: input.preferredSlot,
      candidateSlots: input.candidateSlots
    });

    const action = await this.runtime.gateway.execute({
      tenantId: input.tenantId,
      workflowId,
      agentId: "SCHEDULING",
      action: "CALENDAR_CREATE",
      idempotencyKey: `appointment:${workflowId}:${scheduling.selectedSlot}`,
      input: {
        customerId: input.customerId ?? "new-customer",
        start: scheduling.selectedSlot,
        service: intake.service
      }
    });

    if (action.status !== "EXECUTED") {
      workflow = this.#move(workflow, "ESCALATED", "SCHEDULING_ACTION_BLOCKED", action);
      return { workflow, intake, qualification, routing, scheduling, action };
    }

    workflow = this.#move(workflow, "SCHEDULED", "APPOINTMENT_VERIFIED", action.verification);
    return { workflow, intake, qualification, routing, scheduling, action };
  }

  #move(workflow, state, eventType, payload) {
    const next = this.stateMachine.transition(workflow, state);
    this.runtime.eventStore.append({
      eventType,
      tenantId: workflow.tenantId,
      workflowId: workflow.workflowId,
      actor: "ORCHESTRATOR",
      fromState: workflow.state,
      toState: state,
      payload
    });
    return next;
  }
}

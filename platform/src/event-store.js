import { randomUUID } from "node:crypto";

export class EventStore {
  #events = [];
  append(event) {
    const record = Object.freeze({
      eventId: event.eventId ?? randomUUID(),
      occurredAt: event.occurredAt ?? new Date().toISOString(),
      ...event
    });
    this.#events.push(record);
    return record;
  }
  all() { return [...this.#events]; }
  forWorkflow(workflowId) { return this.#events.filter((e) => e.workflowId === workflowId); }
}

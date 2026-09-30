import { randomUUID } from "node:crypto";

export class InMemoryCalendar {
  constructor() { this.events = new Map(); }
  async create(input) {
    const eventId = randomUUID();
    const event = Object.freeze({
      eventId,
      tenantId: input.tenantId,
      customerId: input.customerId,
      start: input.start,
      service: input.service,
      status: "CONFIRMED"
    });
    this.events.set(eventId, event);
    return event;
  }
  async get(eventId) { return this.events.get(eventId) ?? null; }
}

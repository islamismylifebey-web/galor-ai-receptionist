const confidence = 0.99;

export const referenceAgents = Object.freeze({
  INTAKE: {
    async run(input) {
      const service = String(input.service ?? input.message ?? "").trim();
      const urgency = /emergency|gas smell|fire|urgent/i.test(service) ? "URGENT" : "ROUTINE";
      return { intent: "SERVICE_REQUEST", service, urgency, missing: [], confidence };
    }
  },
  QUALIFICATION: {
    async run(input) {
      const missing = ["name","phone","service"].filter((k) => !input[k]);
      return { status: missing.length ? "PARTIAL" : "QUALIFIED", missing, confidence };
    }
  },
  ROUTING: {
    async run(input) {
      const requiresHuman = /gas smell|fire|legal|lawsuit/i.test(input.service ?? "");
      return { route: "HVAC_REPAIR", requiresHuman, confidence };
    }
  },
  SCHEDULING: {
    async run(input) {
      return { candidateSlots: input.candidateSlots ?? [], selectedSlot: input.preferredSlot ?? input.candidateSlots?.[0], confidence };
    }
  }
});

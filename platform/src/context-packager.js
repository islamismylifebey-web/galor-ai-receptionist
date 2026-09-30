const ALLOWED = Object.freeze({
  INTAKE: ["message","channel","businessRules","recentConversation"],
  QUALIFICATION: ["intake","businessRules","serviceCatalog","customerSummary"],
  CUSTOMER_IDENTITY: ["identityHints","customerCandidates"],
  ROUTING: ["intake","qualification","businessRules"],
  SCHEDULING: ["customerPreferences","candidateSlots","businessRules"],
  ESTIMATE: ["jobFacts","priceBook","warrantyRules"],
  FOLLOW_UP: ["customerState","consent","recentConversation","businessRules"],
  JOB_PREPARATION: ["customerSummary","jobFacts","equipmentHistory","appointment"],
  COMPLETION: ["jobFacts","technicianEvidence","businessRules"],
  BILLING: ["jobFacts","invoiceFacts","paymentState","businessRules"],
  REPUTATION: ["jobOutcome","satisfaction","consent","businessRules"],
  RETENTION: ["customerSummary","serviceHistory","consent","businessRules"],
  BUSINESS_INTELLIGENCE: ["metrics","evidenceRefs"],
  SUPERVISOR: ["metrics","traces","health"],
  VERIFIER: ["claim","evidenceRefs","observedState"]
});

export function packageContext(agentId, source) {
  const keys = ALLOWED[agentId] ?? [];
  return Object.fromEntries(keys.filter((k) => source[k] !== undefined).map((k) => [k, source[k]]));
}

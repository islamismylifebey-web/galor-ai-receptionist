export const STATES = Object.freeze([
  "NEW","IDENTIFIED","QUALIFYING","QUALIFIED","SCHEDULING","SCHEDULED",
  "JOB_IN_PROGRESS","JOB_COMPLETED","INVOICED","PAID","REVIEW_REQUESTED",
  "RETAINED","CLOSED","ESCALATED","WAITING_CUSTOMER","WAITING_EMPLOYEE",
  "WAITING_PAYMENT","CANCELED","DISPUTED","FAILED","DEAD_LETTER"
]);

export const ACTIONS = Object.freeze({
  CUSTOMER_LOOKUP: { risk: 0, mutating: false },
  CALENDAR_READ: { risk: 0, mutating: false },
  INTERNAL_NOTE_CREATE: { risk: 1, mutating: true },
  DRAFT_CREATE: { risk: 1, mutating: true },
  SEND_SMS: { risk: 2, mutating: true },
  SEND_EMAIL: { risk: 2, mutating: true },
  CALENDAR_CREATE: { risk: 3, mutating: true },
  CALENDAR_UPDATE: { risk: 3, mutating: true },
  JOB_UPDATE: { risk: 3, mutating: true },
  INVOICE_CREATE: { risk: 3, mutating: true },
  CHARGE: { risk: 4, mutating: true },
  REFUND: { risk: 4, mutating: true },
  DISCOUNT_APPLY: { risk: 4, mutating: true },
  RECORD_DELETE: { risk: 5, mutating: true },
  POLICY_UPDATE: { risk: 5, mutating: true }
});

const contract = (id, role, actions, outputSchema) => Object.freeze({
  id, role, actions: Object.freeze(actions), outputSchema,
  prohibited: Object.freeze(["secret_exfiltration","cross_tenant_access","self_authorization"])
});

export const AGENT_CONTRACTS = Object.freeze({
  INTAKE: contract("INTAKE","Turn untrusted customer communication into structured intake.",["CUSTOMER_LOOKUP","INTERNAL_NOTE_CREATE"],["intent","service","urgency","missing","confidence"]),
  QUALIFICATION: contract("QUALIFICATION","Determine whether the opportunity is serviceable and complete.",["CUSTOMER_LOOKUP","INTERNAL_NOTE_CREATE"],["status","missing","confidence"]),
  CUSTOMER_IDENTITY: contract("CUSTOMER_IDENTITY","Resolve customer identity without autonomous merges.",["CUSTOMER_LOOKUP"],["status","candidateIds","confidence"]),
  ROUTING: contract("ROUTING","Route the request to the correct business workflow.",["INTERNAL_NOTE_CREATE"],["route","requiresHuman","confidence"]),
  SCHEDULING: contract("SCHEDULING","Reason over customer preferences and request verified calendar actions.",["CALENDAR_READ","CALENDAR_CREATE","CALENDAR_UPDATE"],["candidateSlots","selectedSlot","confidence"]),
  ESTIMATE: contract("ESTIMATE","Prepare estimates from authoritative pricing inputs.",["DRAFT_CREATE","INTERNAL_NOTE_CREATE"],["lineItems","total","confidence"]),
  FOLLOW_UP: contract("FOLLOW_UP","Manage context-aware follow-up within consent and policy.",["SEND_SMS","SEND_EMAIL","INTERNAL_NOTE_CREATE"],["channel","message","nextAt","confidence"]),
  JOB_PREPARATION: contract("JOB_PREPARATION","Assemble a concise job packet from authorized facts.",["CUSTOMER_LOOKUP","INTERNAL_NOTE_CREATE"],["jobPacket","confidence"]),
  COMPLETION: contract("COMPLETION","Check job completion evidence before downstream billing.",["JOB_UPDATE","INTERNAL_NOTE_CREATE"],["complete","missing","confidence"]),
  BILLING: contract("BILLING","Prepare invoices and bounded payment actions.",["INVOICE_CREATE","CHARGE","REFUND","DISCOUNT_APPLY","INTERNAL_NOTE_CREATE"],["action","amount","confidence"]),
  REPUTATION: contract("REPUTATION","Handle satisfaction recovery and compliant review requests.",["SEND_SMS","SEND_EMAIL","INTERNAL_NOTE_CREATE"],["satisfied","action","confidence"]),
  RETENTION: contract("RETENTION","Identify legitimate reactivation opportunities.",["SEND_SMS","SEND_EMAIL","INTERNAL_NOTE_CREATE"],["opportunity","channel","confidence"]),
  BUSINESS_INTELLIGENCE: contract("BUSINESS_INTELLIGENCE","Explain business outcomes from traceable records.",["CUSTOMER_LOOKUP"],["summary","evidenceRefs","confidence"]),
  SUPERVISOR: contract("SUPERVISOR","Detect abnormal system behavior and recommend remediation.",["CUSTOMER_LOOKUP","CALENDAR_READ"],["severity","finding","recommendedAction","confidence"]),
  VERIFIER: contract("VERIFIER","Independently challenge material agent claims.",["CUSTOMER_LOOKUP","CALENDAR_READ"],["verdict","evidenceRefs","confidence"])
});

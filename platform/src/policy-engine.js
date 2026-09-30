export const DEFAULT_POLICY = Object.freeze({
  maxAutonomousCharge: 1000,
  maxAutonomousDiscount: 25,
  alwaysHumanApproval: Object.freeze(["REFUND","RECORD_DELETE","POLICY_UPDATE"]),
  consentRequired: Object.freeze(["SEND_SMS","SEND_EMAIL","CHARGE"])
});

export class PolicyEngine {
  constructor(policyByTenant = {}) { this.policyByTenant = policyByTenant; }
  policyFor(tenantId) { return { ...DEFAULT_POLICY, ...(this.policyByTenant[tenantId] ?? {}) }; }
  authorize({ tenantId, action, input = {}, approvedBy = null }) {
    const policy = this.policyFor(tenantId);
    if (policy.consentRequired.includes(action) && input.consent !== true) return { allowed: false, reason: "CONSENT_REQUIRED" };
    if (policy.alwaysHumanApproval.includes(action) && !approvedBy) return { allowed: false, approvalRequired: true, reason: "HUMAN_APPROVAL_REQUIRED" };
    if (action === "CHARGE" && Number(input.amount) > policy.maxAutonomousCharge && !approvedBy) return { allowed: false, approvalRequired: true, reason: "CHARGE_LIMIT_EXCEEDED" };
    if (action === "DISCOUNT_APPLY" && Number(input.amount) > policy.maxAutonomousDiscount && !approvedBy) return { allowed: false, approvalRequired: true, reason: "DISCOUNT_LIMIT_EXCEEDED" };
    return { allowed: true, approvedBy };
  }
}

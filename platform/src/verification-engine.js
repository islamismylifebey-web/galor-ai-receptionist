export class VerificationEngine {
  constructor(verifiers = {}) { this.verifiers = verifiers; }
  async verify(action, execution, request) {
    const verifier = this.verifiers[action];
    if (!verifier) return { verified: false, reason: "NO_VERIFIER_REGISTERED" };
    const result = await verifier(execution, request);
    return result?.verified ? result : { verified: false, reason: result?.reason ?? "VERIFICATION_FAILED" };
  }
}

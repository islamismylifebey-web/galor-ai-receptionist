import { randomUUID } from "node:crypto";

export class InMemoryPayments {
  constructor() { this.transactions = new Map(); }
  async charge(input) {
    const transactionId = randomUUID();
    const tx = Object.freeze({
      transactionId,
      tenantId: input.tenantId,
      invoiceId: input.invoiceId,
      amount: Number(input.amount),
      status: "SUCCEEDED"
    });
    this.transactions.set(transactionId, tx);
    return tx;
  }
  async get(transactionId) { return this.transactions.get(transactionId) ?? null; }
}

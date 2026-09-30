export class WorkQueue {
  constructor({ maxAttempts = 3 } = {}) {
    this.maxAttempts = maxAttempts;
    this.pending = [];
    this.deadLetters = [];
  }
  enqueue(job) { this.pending.push({ ...job, attempts: job.attempts ?? 0 }); }
  async drain(handler) {
    while (this.pending.length) {
      const job = this.pending.shift();
      try {
        await handler(job);
      } catch (error) {
        const failed = { ...job, attempts: job.attempts + 1, lastError: String(error.message ?? error) };
        if (failed.attempts >= this.maxAttempts) this.deadLetters.push(failed);
        else this.pending.push(failed);
      }
    }
    return { pending: this.pending.length, deadLetters: [...this.deadLetters] };
  }
}

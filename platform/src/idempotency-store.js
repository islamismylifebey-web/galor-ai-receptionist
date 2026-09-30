export class IdempotencyStore {
  #records = new Map();
  get(key) { return this.#records.get(key); }
  commit(key, value) {
    if (this.#records.has(key)) return this.#records.get(key);
    this.#records.set(key, Object.freeze(value));
    return value;
  }
}

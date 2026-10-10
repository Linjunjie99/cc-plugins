import crypto from "node:crypto";

export class ConfirmationStore {
  constructor(ttlMs = 10 * 60 * 1000) {
    this.ttlMs = ttlMs;
    this.tokens = new Map();
  }

  create(payload) {
    const token = crypto.randomBytes(24).toString("base64url");
    this.tokens.set(token, { payload, expiresAt: Date.now() + this.ttlMs });
    return { token, expires_at: new Date(Date.now() + this.ttlMs).toISOString() };
  }

  consume(token) {
    const entry = this.tokens.get(token);
    this.tokens.delete(token);
    if (!entry || entry.expiresAt < Date.now()) throw new Error("Confirmation token is invalid or expired; prepare the operation again");
    return entry.payload;
  }
}

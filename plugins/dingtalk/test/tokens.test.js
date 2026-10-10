import assert from "node:assert/strict";
import test from "node:test";
import { ConfirmationStore } from "../src/tokens.js";

test("confirmation tokens are single-use", () => {
  const store = new ConfirmationStore();
  const confirmation = store.create({ operation: "test" });

  assert.deepEqual(store.consume(confirmation.token), { operation: "test" });
  assert.throws(() => store.consume(confirmation.token), /invalid or expired/);
});

test("expired confirmation tokens are rejected", () => {
  const store = new ConfirmationStore(-1);
  const confirmation = store.create({ operation: "test" });

  assert.throws(() => store.consume(confirmation.token), /invalid or expired/);
});

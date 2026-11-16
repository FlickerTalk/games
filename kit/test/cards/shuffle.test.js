import { describe, expect, it } from "vitest";
import { CARDS, SEED_BYTES, commitText, revealText, seedText, shuffleStep, shuffled } from "../../src/cards/shuffle.js";

const A = Uint8Array.from({ length: SEED_BYTES }, (_, at) => at + 1);
const B = new Uint8Array(SEED_BYTES).fill(0x5a);
const start = { commit: null, seedB: null };

describe("a deck shuffled by two phones", () => {
  it("is the fifty-two cards once each, the same for the same two seeds and another for any other", () => {
    const one = shuffled(A, B);
    expect([...one].sort((a, b) => a - b)).toEqual(Array.from({ length: CARDS }, (_, card) => card));
    expect(shuffled(A, B)).toEqual(one);
    expect(shuffled(B, A)).not.toEqual(one);
    expect(shuffled(A, new Uint8Array(SEED_BYTES))).not.toEqual(one);
  });

  it("is the very deck Crazy Eights deals from the same seeds", async () => {
    const eights = await import("../../../games/eights/src/rules.js");
    expect(shuffled(A, B)).toEqual(eights.shuffled(A, B));
    expect(commitText(A)).toBe(eights.commitText(A));
  });

  it("takes the dealer's commitment, then the other side's seed, then the dealer's reveal, and gives the deck", () => {
    const committed = shuffleStep(start, commitText(A), 0);
    expect(committed).toEqual({ commit: commitText(A).slice(1), seedB: null, next: 1 });
    const answered = shuffleStep(committed, seedText(B), 1);
    expect(answered).toMatchObject({ seedB: seedText(B).slice(1), next: 0 });
    expect(shuffleStep(answered, revealText(A), 0)).toEqual({ deck: shuffled(A, B) });
  });

  it("refuses a step out of order, out of turn or badly written", () => {
    expect(shuffleStep(start, seedText(B), 0)).toEqual({ error: "bad" });
    expect(shuffleStep(start, commitText(A), 1)).toEqual({ error: "turn" });
    expect(shuffleStep(start, "c123", 0)).toEqual({ error: "bad" });
    const committed = shuffleStep(start, commitText(A), 0);
    expect(shuffleStep(committed, "sAAAA", 1)).toEqual({ error: "bad" });
    expect(shuffleStep(committed, seedText(B), 0)).toEqual({ error: "turn" });
  });

  it("calls a reveal that does not match the commitment a cheat", () => {
    const answered = shuffleStep(shuffleStep(start, commitText(A), 0), seedText(B), 1);
    expect(shuffleStep(answered, revealText(B), 0)).toEqual({ cheat: true });
  });
});

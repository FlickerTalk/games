import { describe, expect, it, vi } from "vitest";
import { Dealer, storeKey } from "../src/dealer.js";
import { commitText, initial, play, revealText, seedText, turn } from "../src/rules.js";
import { fromBase64url } from "../src/sha256.js";

const A = Uint8Array.from({ length: 24 }, (_, at) => at + 1);
const B = new Uint8Array(24).fill(0x5a);
const replay = (moves) => moves.reduce((state, move) => play(state, move, turn(state)).state, initial());

function store(kept = new Map()) {
  return { kept, get: vi.fn(async (key) => kept.get(key) ?? null), set: vi.fn(async (key, value) => (kept.set(key, value), true)) };
}

const context = (moves, extra = {}) => ({ state: replay(moves), view: { me: "me-1", index: 0 }, mySide: turn(replay(moves)), canPlay: true, play: vi.fn(), ...extra });

describe("the shuffle kept on this phone", () => {
  it("keeps its seed under the same key as before, so a match begun with the old board still reveals", () => {
    expect(storeKey("me-1", 2)).toBe("eights/me-1/2");
  });

  it("commits on its own as the dealer, keeping the seed, then reveals the same seed", async () => {
    const kept = store();
    const dealer = new Dealer(kept, () => A);
    await dealer.recall(storeKey("me-1", 0));
    const first = context([], { mySide: 0 });
    await dealer.settle(first);
    expect(first.play).toHaveBeenCalledWith(commitText(A));
    expect(fromBase64url(kept.kept.get(storeKey("me-1", 0)))).toEqual(A);
    const later = context([commitText(A), seedText(B)], { mySide: 0 });
    await dealer.settle(later);
    expect(later.play).toHaveBeenCalledWith(revealText(A));
  });

  it("answers the commitment with a seed of its own as the other side, once", async () => {
    const dealer = new Dealer(store(), () => B);
    await dealer.recall(storeKey("me-1", 0));
    const ctx = context([commitText(A)], { mySide: 1 });
    await dealer.settle(ctx);
    await dealer.settle(ctx);
    expect(ctx.play).toHaveBeenCalledTimes(1);
    expect(ctx.play).toHaveBeenCalledWith(seedText(B));
  });

  it("reveals a seed kept from before the game was closed, and says so when it is gone", async () => {
    const kept = store();
    const first = new Dealer(kept, () => A);
    await first.recall(storeKey("me-1", 0));
    await first.settle(context([], { mySide: 0 }));
    const dealer = new Dealer(kept, () => B);
    await dealer.recall(storeKey("me-1", 0));
    const ctx = context([commitText(A), seedText(B)], { mySide: 0 });
    expect(dealer.loaded).toBe(true);
    await dealer.settle(ctx);
    expect(ctx.play).toHaveBeenCalledWith(revealText(A));

    const forgetful = new Dealer(store(), () => B);
    await forgetful.recall(storeKey("me-1", 0));
    const lost = context([commitText(A), seedText(B)], { mySide: 0 });
    await forgetful.settle(lost);
    expect(lost.play).not.toHaveBeenCalled();
    expect(forgetful.lost).toBe(true);
  });

  it("does nothing before its seed is read back, off turn, or once the cards are dealt, and starts over with a new round", async () => {
    const dealer = new Dealer(store(), () => A);
    const early = context([], { mySide: 0 });
    await dealer.settle(early);
    expect(early.play).not.toHaveBeenCalled();
    await dealer.recall(storeKey("me-1", 0));
    for (const ctx of [context([], { mySide: 0, canPlay: false }), context([commitText(A), seedText(B), revealText(A)], { mySide: 0 })]) {
      await dealer.settle(ctx);
      expect(ctx.play).not.toHaveBeenCalled();
    }
    const failing = new Dealer({ get: async () => null, set: async () => false }, () => A);
    await failing.recall("x");
    const unsaved = context([], { mySide: 0 });
    await failing.settle(unsaved);
    expect(unsaved.play).not.toHaveBeenCalled();
    dealer.lost = true;
    dealer.newRound();
    expect(dealer.lost).toBe(false);
  });
});

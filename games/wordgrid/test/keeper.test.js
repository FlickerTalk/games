import { describe, expect, it, vi } from "vitest";
import { Seeds, storeKey } from "../src/keeper.js";
import { commitText, initial, play, revealText, seedText, turn } from "../src/rules.js";
import { fromBase64url, toBase64url } from "../src/sha256.js";

const A = Uint8Array.from({ length: 24 }, (_, at) => at + 1);
const B = new Uint8Array(24).fill(0x5a);
const KEY = storeKey("me-1", 0);

function shuffled(moves) {
  let state = initial();
  for (const move of moves) state = play(state, move, turn(state)).state;
  return state;
}

const context = (moves, extra = {}) => ({ state: shuffled(moves), view: { index: 0 }, mySide: turn(shuffled(moves)), canPlay: true, lang: "en", play: vi.fn(), ...extra });

function memory(kept = {}) {
  const map = new Map(Object.entries(kept));
  return { map, get: vi.fn(async (key) => map.get(key) ?? null), set: vi.fn(async (key, value) => (map.set(key, value), true)) };
}

describe("the seed of the letters' draw", () => {
  it("is drawn by side 0, kept in the plugin's store before its commitment is played in the phone's language, then revealed", async () => {
    const store = memory();
    const seeds = new Seeds(store, () => A);
    await seeds.recall(KEY);
    const first = context([], { lang: "es-ES" });
    await seeds.settle(first, KEY);
    expect(store.map.get(KEY)).toBe(toBase64url(A));
    expect(first.play).toHaveBeenCalledWith(commitText("es", A));
    await seeds.settle(first, KEY);
    expect(first.play).toHaveBeenCalledTimes(1);
    const reveal = context([commitText("es", A), seedText(B)], { mySide: 0 });
    await seeds.settle(reveal, KEY);
    expect(reveal.play).toHaveBeenCalledWith(revealText(A));
  });

  it("is answered with a fresh seed by side 1", async () => {
    const seeds = new Seeds(memory(), () => B);
    await seeds.recall(KEY);
    const answer = context([commitText("en", A)]);
    await seeds.settle(answer, KEY);
    expect(answer.play).toHaveBeenCalledWith(seedText(B));
  });

  it("plays nothing before the store has been read, while it is not the phone's turn, or when the store will not keep the seed", async () => {
    const store = memory();
    store.set = vi.fn(async () => false);
    const seeds = new Seeds(store, () => A);
    const early = context([]);
    await seeds.settle(early, KEY);
    expect(early.play).not.toHaveBeenCalled();
    await seeds.recall(KEY);
    const waiting = context([], { canPlay: false });
    await seeds.settle(waiting, KEY);
    expect(waiting.play).not.toHaveBeenCalled();
    const refused = context([]);
    await seeds.settle(refused, KEY);
    expect(refused.play).not.toHaveBeenCalled();
  });

  it("finds its seed in the store after the game is opened again, and knows it is lost when it is not there", async () => {
    const kept = new Seeds(memory({ [KEY]: toBase64url(A) }));
    await kept.recall(KEY);
    const reveal = context([commitText("en", A), seedText(B)], { mySide: 0 });
    await kept.settle(reveal, KEY);
    expect(reveal.play).toHaveBeenCalledWith(revealText(A));
    expect(fromBase64url(toBase64url(A))).toEqual(A);

    const gone = new Seeds(memory());
    await gone.recall(KEY);
    const stuck = context([commitText("en", A), seedText(B)], { mySide: 0 });
    await gone.settle(stuck, KEY);
    expect(stuck.play).not.toHaveBeenCalled();
    expect(gone.lost).toBe(true);
    gone.forget();
    expect(gone.lost).toBe(false);
  });
});

import { describe, expect, it, vi } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { createRoller, storeKey } from "../src/roll.js";
import { POINTS, commitText, initial, play, revealText, seedText, turn } from "../src/rules.js";
import { fromBase64url, toBase64url } from "../src/sha256.js";
import { TEXTS } from "../src/texts.js";

const translate = translator(joinTexts(KIT_TEXTS, TEXTS));
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const A = Uint8Array.from({ length: 24 }, (_, at) => at + 1);
const B = new Uint8Array(24).fill(0x5a);
const ROLL = [commitText(A), seedText(B), revealText(A)];

function context(moves, extra = {}) {
  let state = initial();
  for (const move of moves) state = play(state, move, turn(state)).state;
  return {
    state,
    view: { me: "me-1", index: 0, round: { moves } },
    mySide: turn(state),
    canPlay: !state.end,
    lang: "en",
    t: (key, vars) => translate("en", key, vars),
    play: vi.fn(),
    notify: vi.fn(),
    ...extra,
  };
}

function storeOf(kept = new Map(), { refuse = false } = {}) {
  return { store: { get: vi.fn(async (key) => kept.get(key) ?? null), set: vi.fn(async (key, value) => (refuse ? false : (kept.set(key, value), true))) }, kept };
}

async function settled() {
  await tick();
  await tick();
}

describe("the dice rolled by both phones", () => {
  it("commits as the side to roll, keeping its seed in the store, then reveals it once the other seed is in", async () => {
    const ft = storeOf();
    const ctx = context([], { mySide: 0 });
    const roller = createRoller(ft, ctx);
    await settled();
    expect(ctx.play).toHaveBeenCalledTimes(1);
    const commit = ctx.play.mock.calls[0][0];
    expect(commit).toMatch(/^c[A-Za-z0-9_-]{43}$/);
    const seed = fromBase64url(ft.kept.get(storeKey("me-1", "0/0")));
    expect(commitText(seed)).toBe(commit);
    ctx.play.mockClear();
    roller.update({ ...context([commit, seedText(B)], { mySide: 0 }), play: ctx.play });
    await settled();
    expect(ctx.play).toHaveBeenCalledWith(revealText(seed));
  });

  it("reveals a seed kept before the game was closed", async () => {
    const ft = storeOf(new Map([[storeKey("me-1", "0/0"), toBase64url(A)]]));
    const ctx = context(ROLL.slice(0, 2), { mySide: 0 });
    createRoller(ft, ctx);
    await settled();
    expect(ctx.play).toHaveBeenCalledWith(ROLL[2]);
  });

  it("answers the other side's commitment with a seed of its own", async () => {
    const ctx = context([ROLL[0]], { mySide: 1 });
    createRoller(storeOf(), ctx);
    await settled();
    expect(ctx.play).toHaveBeenCalledTimes(1);
    expect(ctx.play.mock.calls[0][0]).toMatch(/^s[A-Za-z0-9_-]{32}$/);
  });

  it("says once that its own seed was lost, and plays nothing", async () => {
    const ctx = context(ROLL.slice(0, 2), { mySide: 0 });
    const roller = createRoller(storeOf(), ctx);
    await settled();
    roller.update({ ...ctx });
    await settled();
    expect(ctx.play).not.toHaveBeenCalled();
    expect(ctx.notify).toHaveBeenCalledTimes(1);
    expect(ctx.notify).toHaveBeenCalledWith(expect.stringContaining("The roll was lost"));
  });

  it("does not commit to a seed the store would not keep", async () => {
    const ctx = context([], { mySide: 0 });
    createRoller(storeOf(new Map(), { refuse: true }), ctx);
    await settled();
    expect(ctx.play).not.toHaveBeenCalled();
  });

  it("passes on its own when the dice allow no move", async () => {
    const state = initial();
    state.points = Array.from({ length: POINTS }, () => [0, 0]);
    for (const [point, side, count] of [[0, 0, 2], [1, 0, 2], [2, 0, 2], [3, 0, 2], [4, 0, 2], [5, 0, 2], [20, 0, 3], [11, 1, 14]]) state.points[point][side] = count;
    Object.assign(state, { bar: [0, 1], next: 1, dice: [6, 2], left: [6, 2] });
    const ctx = { ...context([]), state, mySide: 1 };
    createRoller(storeOf(), ctx);
    await settled();
    expect(ctx.play).toHaveBeenCalledWith("x");
  });

  it("plays nothing off turn, nor twice for the same step", async () => {
    const off = context([], { mySide: 0, canPlay: false });
    createRoller(storeOf(), off);
    await settled();
    expect(off.play).not.toHaveBeenCalled();
    const ctx = context([], { mySide: 0 });
    const roller = createRoller(storeOf(), ctx);
    await settled();
    roller.update({ ...ctx });
    await settled();
    expect(ctx.play).toHaveBeenCalledTimes(1);
  });
});

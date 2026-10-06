// The board of Letter Grid: the draw made on its own (the first side's seed kept in the store),
// the tiles, a word built by tapping touching letters and said with a button, a letter taken
// back, a pass, the lists and the scores.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { MARKS, board, storeKey } from "../src/board.js";
import { TEXTS } from "../src/texts.js";
import { commitText, initial, play, result, revealText, seedText, turn } from "../src/rules.js";
import { fromBase64url } from "../src/sha256.js";

const translate = translator(joinTexts(KIT_TEXTS, TEXTS));
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const A = Uint8Array.from({ length: 24 }, (_, at) => at + 1);
const B = new Uint8Array(24).fill(0x5a);
const OPENING = [commitText("en", A), seedText(B), revealText(A)];

function context(moves, extra = {}) {
  let state = initial();
  for (const move of moves) state = play(state, move, turn(state)).state;
  const over = result(state);
  return {
    state,
    view: { me: "me-1", index: 0, round: { moves } },
    mySide: turn(state),
    canPlay: !over,
    last: moves.at(-1) ?? null,
    pending: false,
    result: over ? { k: "rules", winner: over.winner, result: over } : null,
    lang: "en",
    t: (key, vars) => translate("en", key, vars),
    play: vi.fn(),
    ...extra,
  };
}

/** A context with a grid set by hand (English), side 1 to move. */
const onGrid = (letters, extra = {}) => {
  const ctx = context(OPENING);
  return { ...ctx, state: { ...ctx.state, grid: [...letters], next: 1 }, mySide: 1, ...extra };
};

let store;
beforeEach(() => {
  store = new Map();
  globalThis.ft = { store: { get: vi.fn(async (key) => store.get(key) ?? null), set: vi.fn(async (key, value) => (store.set(key, value), true)) } };
});

describe("the draw", () => {
  it("commits on its own as side 0 with the phone's language, keeping the seed, then reveals it", async () => {
    const host = document.createElement("div");
    const ctx = context([], { mySide: 0, lang: "es", t: (key, vars) => translate("es", key, vars) });
    const mounted = board.mount(host, ctx);
    await tick();
    await tick();
    expect(host.textContent).toContain("Sacando las letras");
    expect(ctx.play).toHaveBeenCalledTimes(1);
    const commit = ctx.play.mock.calls[0][0];
    expect(commit).toMatch(/^ces[A-Za-z0-9_-]{43}$/);
    const seed = fromBase64url(store.get(storeKey("me-1", 0)));
    expect(commitText("es", seed)).toBe(commit);
    ctx.play.mockClear();
    mounted.update({ ...context([commit, seedText(B)], { mySide: 0 }), play: ctx.play });
    await tick();
    expect(ctx.play).toHaveBeenCalledWith(revealText(seed));
  });

  it("answers with a seed as side 1, and says so when its own seed is lost", async () => {
    const host = document.createElement("div");
    const ctx = context([OPENING[0]], { mySide: 1 });
    board.mount(host, ctx);
    await tick();
    await tick();
    expect(ctx.play.mock.calls[0][0]).toMatch(/^s[A-Za-z0-9_-]{32}$/);
    const lost = document.createElement("div");
    const stuck = context(OPENING.slice(0, 2), { mySide: 0 });
    board.mount(lost, stuck);
    await tick();
    await tick();
    expect(stuck.play).not.toHaveBeenCalled();
    expect(lost.textContent).toContain("The draw was lost");
  });
});

describe("the grid", () => {
  it("shows the sixteen tiles, named, and builds a word along touching tiles, then says it", async () => {
    const host = document.createElement("div");
    const ctx = onGrid("catsoxeetnrfdlmp");
    board.mount(host, ctx);
    await tick();
    expect(host.querySelectorAll(".fwg-tile")).toHaveLength(16);
    expect(host.querySelector('[data-cell="0"]').getAttribute("aria-label")).toBe("C, row 1, column 1");
    expect(host.querySelectorAll(".fwg-tile:not([disabled])")).toHaveLength(16, "any tile starts a word");
    expect(host.querySelector('[data-act="say"]').disabled).toBe(true);
    host.querySelector('[data-cell="0"]').click();
    expect(host.querySelector('[data-cell="0"]').classList.contains("lit")).toBe(true);
    expect(host.querySelector('[data-cell="2"]').disabled).toBe(true, "t does not touch c");
    expect(host.querySelector('[data-cell="1"]').disabled).toBe(false);
    host.querySelector('[data-cell="1"]').click();
    host.querySelector('[data-cell="2"]').click();
    expect(host.querySelector(".fwg-word b").textContent).toBe("cat");
    expect(host.querySelector('[data-act="say"]').disabled).toBe(false);
    host.querySelector('[data-act="say"]').click();
    expect(ctx.play).toHaveBeenCalledWith("wcat");
  });

  it("takes a letter back, cuts the path at a lit tile tapped again, and says why a word will not do", async () => {
    const host = document.createElement("div");
    const ctx = onGrid("catsoxeetnrfdlmp");
    board.mount(host, ctx);
    await tick();
    for (const cell of [0, 1, 2]) host.querySelector(`[data-cell="${cell}"]`).click();
    host.querySelector('[data-act="undo"]').click();
    expect(host.querySelector(".fwg-word b").textContent).toBe("ca");
    host.querySelector('[data-cell="0"]').click();
    expect(host.querySelector(".fwg-word b").textContent).toBe("");
    // t, a, c: "tac" is not a word.
    for (const cell of [2, 1, 0]) host.querySelector(`[data-cell="${cell}"]`).click();
    expect(host.querySelector('[data-act="say"]').disabled).toBe(true);
    expect(host.textContent).toContain("Not in the word list");
    expect(ctx.play).not.toHaveBeenCalled();
  });

  it("passes, shows the words said with their points and the scores, and opens nothing off turn", async () => {
    const host = document.createElement("div");
    const ctx = onGrid("catsoxeetnrfdlmp");
    const said = { ...ctx, state: { ...ctx.state, said: [["sex"], ["cat", "coats"]], score: [1, 3] } };
    board.mount(host, said);
    await tick();
    expect(host.querySelector(".fwg-scores").textContent).toContain("3");
    expect(host.textContent).toContain("your words (2)");
    expect(host.textContent).toContain("their words (1)");
    expect(host.querySelector(".fwg-lists").textContent).toContain("coats");
    host.querySelector('[data-act="pass"]').click();
    expect(said.play).toHaveBeenCalledWith("x");
    const other = document.createElement("div");
    board.mount(other, { ...ctx, canPlay: false });
    expect(other.querySelectorAll(".fwg-tile:not([disabled])")).toHaveLength(0);
    expect(other.querySelector('[data-act="pass"]').disabled).toBe(true);
    expect(MARKS).toHaveLength(2);
  });
});

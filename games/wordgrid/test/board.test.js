import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { TABLETOP_STYLE } from "../../../kit/src/tabletop/board.js";
import { MARKS, STYLE, board, storeKey } from "../src/board.js";
import { TEXTS } from "../src/texts.js";
import { ART } from "../src/theme.js";
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
    notify: vi.fn(),
    ...extra,
  };
}

const onGrid = (letters, extra = {}) => {
  const ctx = context(OPENING);
  return { ...ctx, state: { ...ctx.state, grid: [...letters], next: 1 }, mySide: 1, ...extra };
};

function mount(ctx) {
  const host = document.createElement("div");
  host.getBoundingClientRect = () => ({ left: 0, top: 0, width: 343, height: 343, right: 343, bottom: 343 });
  document.body.append(host);
  return { host, mounted: board.mount(host, ctx) };
}

const tile = (host, cell) => host.querySelector(`button[data-cell="${cell}"]`);
const tap = (host, ...cells) => cells.forEach((cell) => tile(host, cell).click());
const act = (host, name) => host.querySelector(`[data-act="${name}"]`);
const word = (host) => host.querySelector(".fwg-word b").textContent;
const enabled = (host) => [...host.querySelectorAll("button[data-cell]")].filter((one) => !one.disabled).map((one) => Number(one.dataset.cell));
const marked = (host, name) => [...host.querySelectorAll("button[data-mark]")].filter((one) => one.dataset.mark.split(" ").includes(name)).map((one) => Number(one.dataset.cell));

let store;
beforeEach(() => {
  store = new Map();
  globalThis.ft = { store: { get: vi.fn(async (key) => store.get(key) ?? null), set: vi.fn(async (key, value) => (store.set(key, value), true)) } };
});
afterEach(() => {
  document.body.innerHTML = "";
});

describe("the draw", () => {
  it("commits on its own as side 0 with the phone's language, keeping the seed, then reveals it", async () => {
    const ctx = context([], { mySide: 0, lang: "es", t: (key, vars) => translate("es", key, vars) });
    const { host, mounted } = mount(ctx);
    await tick();
    await tick();
    expect(host.textContent).toContain("Sacando las letras");
    expect(host.querySelectorAll("button[data-cell]")).toHaveLength(0);
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
    const ctx = context([OPENING[0]], { mySide: 1 });
    mount(ctx);
    await tick();
    await tick();
    expect(ctx.play.mock.calls[0][0]).toMatch(/^s[A-Za-z0-9_-]{32}$/);
    const stuck = context(OPENING.slice(0, 2), { mySide: 0 });
    const { host: lost } = mount(stuck);
    await tick();
    await tick();
    expect(stuck.play).not.toHaveBeenCalled();
    expect(stuck.notify).toHaveBeenCalledWith(expect.stringContaining("The draw was lost"));
    expect(lost.textContent).not.toContain("The draw was lost");
  });
});

describe("the grid", () => {
  it("is drawn on a canvas, with a named button over each of the sixteen tiles, and builds a word along touching tiles, then says it", async () => {
    const ctx = onGrid("catsoxeetnrfdlmp");
    const { host } = mount(ctx);
    await tick();
    expect(host.querySelector("canvas").getAttribute("aria-hidden")).toBe("true");
    expect(host.querySelectorAll("button[data-cell]")).toHaveLength(16);
    expect(tile(host, 0).getAttribute("aria-label")).toBe("C, row 1, column 1");
    expect(host.querySelector('[role="group"]').getAttribute("aria-label")).toBe("Grid");
    expect(enabled(host), "any tile starts a word").toHaveLength(16);
    expect(act(host, "say").disabled).toBe(true);
    tap(host, 0);
    expect(marked(host, "path")).toEqual([0]);
    expect(tile(host, 2).disabled, "t does not touch c").toBe(true);
    expect(tile(host, 1).disabled).toBe(false);
    tap(host, 1, 2);
    expect(word(host)).toBe("cat");
    expect(act(host, "say").disabled).toBe(false);
    act(host, "say").click();
    expect(ctx.play).toHaveBeenCalledWith("wcat");
  });

  it("takes a letter back, cuts the path at a traced tile tapped again, and says why a word will not do", async () => {
    const ctx = onGrid("catsoxeetnrfdlmp");
    const { host, mounted } = mount(ctx);
    await tick();
    tap(host, 0, 1, 2);
    act(host, "undo").click();
    expect(word(host)).toBe("ca");
    expect(marked(host, "path")).toEqual([0, 1]);
    tap(host, 0);
    expect(word(host)).toBe("");
    tap(host, 2, 1, 0);
    expect(ctx.notify).not.toHaveBeenCalled();
    expect(act(host, "say").disabled).toBe(false);
    act(host, "say").click();
    expect(ctx.notify).toHaveBeenCalledWith("Not in the word list");
    expect(ctx.play).not.toHaveBeenCalled();
    expect(word(host)).toBe("tac");
    expect(host.textContent).not.toContain("Not in the word list");
    expect(host.querySelector(".fwg-note")).toBeNull();
    mounted.update(ctx);
    expect(ctx.notify).toHaveBeenCalledTimes(1);
  });

  it("says a word already said is already said, at the top", async () => {
    const ctx = onGrid("catsoxeetnrfdlmp");
    ctx.state = { ...ctx.state, said: [["cat"], []] };
    const { host } = mount(ctx);
    await tick();
    tap(host, 0, 1, 2);
    act(host, "say").click();
    expect(ctx.notify).toHaveBeenCalledWith("Already said");
    expect(ctx.play).not.toHaveBeenCalled();
  });

  it("passes, shows the words said with their points and the scores, and opens nothing off turn", async () => {
    const ctx = onGrid("catsoxeetnrfdlmp");
    const said = { ...ctx, state: { ...ctx.state, said: [["sex"], ["cat", "coats"]], score: [1, 3] } };
    const { host } = mount(said);
    await tick();
    expect(host.querySelector(".fwg-scores").textContent).toContain("3");
    expect(host.textContent).toContain("your words (2)");
    expect(host.textContent).toContain("their words (1)");
    expect(host.querySelector(".fwg-lists").textContent).toContain("coats");
    act(host, "pass").click();
    expect(said.play).toHaveBeenCalledWith("x");
    const { host: other } = mount({ ...ctx, canPlay: false });
    expect(enabled(other)).toEqual([]);
    expect(act(other, "pass").disabled).toBe(true);
    expect(MARKS).toHaveLength(2);
  });

  it("marks the last word said, and the one that waits for the other phone", async () => {
    const ctx = onGrid("catsoxeetnrfdlmp", { mySide: 0, canPlay: false });
    const { host, mounted } = mount(ctx);
    const state = play(ctx.state, "wcat", 1).state;
    mounted.update({ ...ctx, state, last: "wcat", mySide: 1, pending: true });
    expect(marked(host, "last")).toEqual([0, 1, 2]);
    expect(marked(host, "pending")).toEqual([2]);
  });

  it("carries the kit's look for a canvas board, and outlines the player whose turn it is in the colour of that side's mark", () => {
    expect(STYLE).toContain(TABLETOP_STYLE);
    expect(STYLE).toContain(`.ftg{--hue-side-0:${ART.sides[0].body};--hue-side-1:${ART.sides[1].body}}`);
  });
});

function rulesOf() {
  const rules = [];
  const walk = (text, small) => {
    let at = 0;
    while (at < text.length) {
      const open = text.indexOf("{", at);
      if (open < 0) break;
      const head = text.slice(at, open).replace(/\/\*[\s\S]*?\*\//g, "").trim();
      let depth = 1;
      let end = open + 1;
      while (depth) {
        if (text[end] === "{") depth += 1;
        if (text[end] === "}") depth -= 1;
        end += 1;
      }
      const body = text.slice(open + 1, end - 1);
      if (head.startsWith("@container")) walk(body, true);
      else if (!head.startsWith("@")) for (const selector of head.split(",")) rules.push([selector.trim(), body, small]);
      at = end;
    }
  };
  walk(STYLE, false);
  return rules;
}

describe("a short board", () => {
  const hiddenOnSmall = () =>
    rulesOf()
      .filter(([, body, small]) => small && /display:\s*none/.test(body))
      .map(([selector]) => selector);

  it("keeps the word, say and pass while the round is played, a phone turned sideways giving the game a board under 260 px", async () => {
    const { host } = mount(onGrid("catsoxeetnrfdlmp"));
    await tick();
    const row = host.querySelector(".fwg-word");
    for (const selector of hiddenOnSmall()) expect(row.matches(selector), selector).toBe(false);
  });

  it("leaves the word row out while the letters are being shuffled, when there is nothing to say yet", async () => {
    const { host } = mount(context([]));
    await tick();
    const row = host.querySelector(".fwg-word");
    expect(hiddenOnSmall().some((selector) => row.matches(selector))).toBe(true);
  });
});

describe("the result", () => {
  it("keeps the lists of words said on a small board once the round is over, scrolling if long", async () => {
    const ctx = onGrid("catsoxeetnrfdlmp");
    const said = ["cat", "coats", "toes", "nets", "rents", "dent", "tent", "sent"];
    const over = { ...ctx.state, phase: "done", said: [said, ["sex"]], score: [12, 1], end: { winner: 0, reason: "passed", score: [12, 1] } };
    const { host } = mount({ ...ctx, state: over, canPlay: false, mySide: 0, result: { k: "rules", winner: 0, result: result(over) } });
    await tick();
    const lists = host.querySelector(".fwg-lists");
    expect(lists.textContent).toContain("rents");
    const rules = rulesOf();
    const hidden = rules.filter(([, body, small]) => small && /display:\s*none/.test(body)).map(([selector]) => selector);
    expect(hidden.length).toBeGreaterThan(0);
    for (const selector of hidden) expect(lists.matches(selector), selector).toBe(false);
    const scrolls = rules.some(([selector, body]) => lists.matches(selector) && /overflow(-y)?:\s*auto/.test(body));
    expect(scrolls).toBe(true);
  });
});

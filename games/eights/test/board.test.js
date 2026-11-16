import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { DRAG_STYLE } from "../../../kit/src/drag.js";
import { TABLETOP_STYLE } from "../../../kit/src/tabletop/board.js";
import { MARKS, STYLE, board } from "../src/board.js";
import { storeKey } from "../src/dealer.js";
import { TEXTS } from "../src/texts.js";
import { ART } from "../src/theme.js";
import { commitText, initial, play, playableCards, result, revealText, seedText, turn } from "../src/rules.js";
import { fromBase64url } from "../src/sha256.js";

const translate = translator(joinTexts(KIT_TEXTS, TEXTS));
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const A = Uint8Array.from({ length: 24 }, (_, at) => at + 1);
const B = new Uint8Array(24).fill(0x5a);
const OPENING = [commitText(A), seedText(B), revealText(A)];

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

function mount(ctx) {
  const host = document.createElement("div");
  host.getBoundingClientRect = () => ({ left: 0, top: 0, width: 343, height: 343, right: 343, bottom: 343 });
  document.body.append(host);
  const mounted = board.mount(host, ctx);
  return { host, mounted };
}

const key = (host, name) => host.querySelector(`button[data-key="${name}"]`);
const hand = (host) => [...host.querySelectorAll("button[data-card]")];
const open = (host) => hand(host).filter((one) => !one.disabled).map((one) => Number(one.dataset.card)).sort((a, b) => a - b);
const TABLE = (base) => ({ ...base, state: { ...base.state, hands: [[1, 2, 3], [0, 20, 14]], pile: [8], suit: 0, next: 1, stock: [40, 41] }, mySide: 1 });

let store;
beforeEach(() => {
  store = new Map();
  globalThis.ft = { store: { get: vi.fn(async (name) => store.get(name) ?? null), set: vi.fn(async (name, value) => (store.set(name, value), true)) } };
});
const realFromPoint = document.elementFromPoint;
afterEach(() => {
  document.elementFromPoint = realFromPoint;
  document.body.innerHTML = "";
});

describe("the shuffle", () => {
  it("commits on its own as the dealer, keeping the seed, then reveals the same seed", async () => {
    const ctx = context([], { mySide: 0 });
    const { host, mounted } = mount(ctx);
    await tick();
    await tick();
    expect(host.querySelector('[role="group"]').getAttribute("aria-label")).toBe("Crazy Eights: Shuffling the deck…");
    expect(ctx.play).toHaveBeenCalledTimes(1);
    const commit = ctx.play.mock.calls[0][0];
    expect(commit).toMatch(/^c[A-Za-z0-9_-]{43}$/);
    const seed = fromBase64url(store.get(storeKey("me-1", 0)));
    expect(commitText(seed)).toBe(commit);
    ctx.play.mockClear();
    mounted.update({ ...context([commit, seedText(B)], { mySide: 0 }), play: ctx.play });
    await tick();
    expect(ctx.play).toHaveBeenCalledWith(revealText(seed));
  });

  it("answers the commitment with a seed of its own as the other side", async () => {
    const ctx = context([OPENING[0]], { mySide: 1 });
    mount(ctx);
    await tick();
    await tick();
    expect(ctx.play).toHaveBeenCalledTimes(1);
    expect(ctx.play.mock.calls[0][0]).toMatch(/^s[A-Za-z0-9_-]{32}$/);
  });

  it("says so when the dealer's seed is no longer on this phone, once, and never inside the board", async () => {
    const ctx = context(OPENING.slice(0, 2), { mySide: 0 });
    const { host, mounted } = mount(ctx);
    await tick();
    await tick();
    expect(ctx.play).not.toHaveBeenCalled();
    expect(ctx.notify).toHaveBeenCalledWith(expect.stringContaining("The shuffle was lost"));
    mounted.update({ ...ctx });
    await tick();
    expect(ctx.notify).toHaveBeenCalledTimes(1);
    expect(host.textContent).not.toContain("The shuffle was lost");
  });
});

describe("the table", () => {
  it("is drawn on a canvas, with the stock, the pile and each card of the hand as named buttons over it", async () => {
    const ctx = context(OPENING);
    const { host } = mount(ctx);
    await tick();
    expect(host.querySelector("canvas").getAttribute("aria-hidden")).toBe("true");
    expect(hand(host)).toHaveLength(7);
    expect(open(host)).toEqual(playableCards(ctx.state, ctx.mySide).sort((a, b) => a - b));
    expect(key(host, "pile").getAttribute("aria-label")).toMatch(/^On the table: /);
    expect(key(host, "stock").getAttribute("aria-label")).toBe(`Draw a card (${ctx.state.stock.length} left)`);
    expect(key(host, "stock").dataset.act).toBe("draw");
    expect(host.querySelector('[role="group"]').getAttribute("aria-label")).toMatch(/^Crazy Eights: 7 cards · On the table: .* · Suit to follow: .* · Your hand: 7 cards$/);
    expect(MARKS).toHaveLength(2);
  });

  it("plays a plain card on a tap, draws from the stock, and asks for a suit on an eight", async () => {
    const ctx = TABLE(context(OPENING));
    const { host } = mount(ctx);
    await tick();
    expect(host.querySelector('[data-card="14"]').disabled).toBe(true);
    host.querySelector('[data-card="0"]').click();
    expect(ctx.play).toHaveBeenCalledWith("p0");
    key(host, "stock").click();
    expect(ctx.play).toHaveBeenCalledWith("d");
    host.querySelector('[data-card="20"]').click();
    expect(ctx.play).toHaveBeenCalledTimes(2);
    expect(host.querySelectorAll("[data-suit]")).toHaveLength(4);
    host.querySelector('[data-suit="d"]').click();
    expect(ctx.play).toHaveBeenCalledWith("p20d");
  });

  it("offers to pass only with the stock gone, and opens nothing off turn", async () => {
    const base = context(OPENING);
    const ctx = { ...base, state: { ...base.state, stock: [] } };
    const { host } = mount(ctx);
    await tick();
    expect(key(host, "stock").dataset.act).toBe("pass");
    expect(key(host, "stock").disabled).toBe(false);
    key(host, "stock").click();
    expect(ctx.play).toHaveBeenCalledWith("x");
    document.body.innerHTML = "";
    const { host: other } = mount({ ...base, canPlay: false });
    expect(open(other)).toEqual([]);
    expect(key(other, "stock").disabled).toBe(true);
  });
});

describe("dragging a card", () => {
  const pointer = (node, type, x, y) => node.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, isPrimary: true, button: 0, pointerType: "touch" }));
  function drag(host, card, over) {
    const node = host.querySelector(`[data-card="${card}"]`);
    pointer(node, "pointerdown", 10, 300);
    pointer(node, "pointermove", 10, 200);
    const lit = key(host, "pile").hasAttribute("data-drop-ok");
    document.elementFromPoint = () => over;
    pointer(host.querySelector('[role="group"]'), "pointerup", 10, 200);
    return lit;
  }

  it("plays a card dragged onto the pile, as a tap does, and only the playable ones drag", async () => {
    const ctx = TABLE(context(OPENING));
    const { host } = mount(ctx);
    await tick();
    expect([...host.querySelectorAll("[data-drag]")].map((one) => Number(one.dataset.card)).sort((a, b) => a - b)).toEqual([0, 20]);
    expect(drag(host, 0, key(host, "pile"))).toBe(true);
    expect(ctx.play).toHaveBeenCalledWith("p0");
  });

  it("asks for the suit of an eight dragged onto the pile, and plays nothing for a card let go elsewhere", async () => {
    const ctx = TABLE(context(OPENING));
    const { host } = mount(ctx);
    await tick();
    drag(host, 20, key(host, "pile"));
    expect(ctx.play).not.toHaveBeenCalled();
    expect(host.querySelectorAll("[data-suit]")).toHaveLength(4);
    pointer(host.querySelector('[data-suit="c"]'), "pointerdown", 20, 20);
    pointer(host.querySelector('[data-suit="c"]'), "pointerup", 20, 20);
    host.querySelector('[data-suit="c"]').click();
    expect(ctx.play).toHaveBeenCalledWith("p20c");
    drag(host, 0, key(host, "stock"));
    drag(host, 0, null);
    expect(ctx.play).toHaveBeenCalledTimes(1);
  });

  it("drags nothing off turn, and carries the kit's look for a canvas board and a drag", () => {
    const { host } = mount({ ...context(OPENING), canPlay: false });
    expect(host.querySelectorAll("[data-drag]")).toHaveLength(0);
    expect(STYLE).toContain(TABLETOP_STYLE);
    expect(STYLE).toContain(DRAG_STYLE);
  });

  it("outlines the player whose turn it is in the colour of that side's mark", () => {
    expect(STYLE).toContain(`.ftg{--hue-side-0:${ART.sides[0].body};--hue-side-1:${ART.sides[1].body}}`);
  });

  it("keeps the suit choices above the stock and the pile they are drawn over", () => {
    expect(STYLE).toContain(".ftg .ftt-layer>button[data-suit]{z-index:1}");
  });
});

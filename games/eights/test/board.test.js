// The table of Crazy Eights: the shuffle made on its own (the dealer's seed kept in the store),
// the hand face up with the playable cards open, the other side's cards face down, the stock and
// the card on the table, an eight asking for a suit, drawing and passing.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { DRAG_STYLE } from "../../../kit/src/drag.js";
import { MARKS, SIGNS, STYLE, board, cardName, storeKey } from "../src/board.js";
import { TEXTS } from "../src/texts.js";
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

let store;
beforeEach(() => {
  store = new Map();
  globalThis.ft = { store: { get: vi.fn(async (key) => store.get(key) ?? null), set: vi.fn(async (key, value) => (store.set(key, value), true)) } };
});

describe("the shuffle", () => {
  it("commits on its own as the dealer, keeping the seed, then reveals the same seed", async () => {
    const host = document.createElement("div");
    const ctx = context([], { mySide: 0 });
    const mounted = board.mount(host, ctx);
    await tick();
    await tick();
    expect(host.textContent).toContain("Shuffling");
    expect(ctx.play).toHaveBeenCalledTimes(1);
    const commit = ctx.play.mock.calls[0][0];
    expect(commit).toMatch(/^c[A-Za-z0-9_-]{43}$/);
    const seed = fromBase64url(store.get(storeKey("me-1", 0)));
    expect(commitText(seed)).toBe(commit);
    // The other side seeded: the dealer reveals.
    const seeded = context([commit, seedText(B)], { mySide: 0 });
    ctx.play.mockClear();
    mounted.update({ ...seeded, play: ctx.play });
    await tick();
    expect(ctx.play).toHaveBeenCalledWith(revealText(seed));
  });

  it("answers the commitment with a seed of its own as the other side", async () => {
    const host = document.createElement("div");
    const ctx = context([OPENING[0]], { mySide: 1 });
    board.mount(host, ctx);
    await tick();
    await tick();
    expect(ctx.play).toHaveBeenCalledTimes(1);
    expect(ctx.play.mock.calls[0][0]).toMatch(/^s[A-Za-z0-9_-]{32}$/);
  });

  it("says so when the dealer's seed is no longer on this phone", async () => {
    const host = document.createElement("div");
    const ctx = context(OPENING.slice(0, 2), { mySide: 0 });
    board.mount(host, ctx);
    await tick();
    await tick();
    expect(ctx.play).not.toHaveBeenCalled();
    expect(ctx.notify).toHaveBeenCalledWith(expect.stringContaining("The shuffle was lost"));
    expect(host.textContent).not.toContain("The shuffle was lost");
  });
});

describe("the table", () => {
  it("shows the hand face up with the playable cards open, the other side's face down, the stock and the table", async () => {
    const host = document.createElement("div");
    const ctx = context(OPENING);
    const { state } = ctx;
    board.mount(host, ctx);
    await tick();
    const me = ctx.mySide;
    expect(host.querySelectorAll(".fce-hand [data-card]")).toHaveLength(7);
    expect(host.querySelectorAll(".fce-backs i")).toHaveLength(7);
    expect(host.textContent).toContain("7 cards");
    const open = [...host.querySelectorAll(".fce-hand [data-card]:not([disabled])")].map((one) => Number(one.dataset.card));
    expect(open.sort((a, b) => a - b)).toEqual(playableCards(state, me).sort((a, b) => a - b));
    expect(host.querySelector(".fce-card.top").getAttribute("aria-label")).toBe(`On the table: ${cardName(state.pile[0], ctx.t)}`);
    expect(host.querySelector('[data-act="draw"]').getAttribute("aria-label")).toBe(`Draw a card (${state.stock.length} left)`);
    expect(host.querySelector('[data-act="pass"]').hidden).toBe(true);
    expect(host.querySelector(".fce-suit svg")).not.toBeNull();
    expect(SIGNS[state.suit]).toContain("<svg");
    expect(host.querySelector(".fce-suit").getAttribute("aria-label")).toMatch(/^Suit to follow: /);
    expect(MARKS).toHaveLength(2);
  });

  it("names the cards in the user's language", () => {
    const t = (key, vars) => translate("es", key, vars);
    expect(cardName(0, t)).toBe("as de picas");
    expect(cardName(23, t)).toBe("jota de corazones");
    expect(cardName(51, t)).toBe("rey de tréboles");
    expect(cardName(35, (key, vars) => translate("en", key, vars))).toBe("10 of diamonds");
  });

  it("plays a plain card on a tap, draws from the stock, and asks for a suit on an eight", async () => {
    const host = document.createElement("div");
    // Side 1 to move with the ace of spades, the eight of hearts and the two of hearts; nine of spades on the table.
    const base = context(OPENING);
    const state = { ...base.state, hands: [[1, 2, 3], [0, 20, 14]], pile: [8], suit: 0, next: 1, stock: [40, 41] };
    const ctx = { ...base, state, mySide: 1 };
    board.mount(host, ctx);
    await tick();
    expect(host.querySelector('[data-card="14"]').disabled).toBe(true);
    host.querySelector('[data-card="0"]').click();
    expect(ctx.play).toHaveBeenCalledWith("p0");
    host.querySelector('[data-act="draw"]').click();
    expect(ctx.play).toHaveBeenCalledWith("d");
    host.querySelector('[data-card="20"]').click();
    expect(ctx.play).toHaveBeenCalledTimes(2);
    const picker = host.querySelector(".fce-pick");
    expect(picker).not.toBeNull();
    expect(picker.querySelectorAll("[data-suit]")).toHaveLength(4);
    picker.querySelector('[data-suit="d"]').click();
    expect(ctx.play).toHaveBeenCalledWith("p20d");
  });

  it("offers to pass only with the stock gone, and opens nothing off turn", async () => {
    const host = document.createElement("div");
    const base = context(OPENING);
    const ctx = { ...base, state: { ...base.state, stock: [] } };
    board.mount(host, ctx);
    await tick();
    const pass = host.querySelector('[data-act="pass"]');
    expect(pass.hidden).toBe(false);
    expect(pass.disabled).toBe(false);
    pass.click();
    expect(ctx.play).toHaveBeenCalledWith("x");
    const other = document.createElement("div");
    board.mount(other, { ...base, canPlay: false });
    expect(other.querySelectorAll(".fce-hand [data-card]:not([disabled])")).toHaveLength(0);
    expect(other.querySelector('[data-act="draw"]').disabled).toBe(true);
  });
});

/** The declarations of the top-level rule of `STYLE` for exactly `selector`. */
const ruleFor = (selector) => {
  const found = [...STYLE.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^}]*)\}/g)].find(([, head]) => head.split(",").map((one) => one.trim()).includes(selector));
  return found ? found[2] : "";
};

describe("the other side's hand", () => {
  // Seen on the phones: the count ("7 cards") ran over the last card of the fan, and was written in
  // the app's background colour, dark on the green felt in a dark theme.
  it("ends the fan of backs before the count, written in a colour of the felt's own", () => {
    expect(ruleFor(".fce-backs i:last-child")).toMatch(/margin-inline-end:\s*0/);
    const ink = ruleFor(".fce-them").match(/(?:^|;|\s)color:\s*([^;]+);/)?.[1].trim();
    expect(ink).toBe("var(--art-felt-ink)");
    expect(STYLE).toMatch(/--art-felt-ink:\s*#ffffff/);
  });
});

describe("dragging a card", () => {
  const realFromPoint = document.elementFromPoint;
  afterEach(() => {
    document.elementFromPoint = realFromPoint;
    document.body.innerHTML = "";
  });
  const pointer = (node, type, x, y) => node.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, isPrimary: true, button: 0, pointerType: "touch" }));
  /** A finger on card `card` of the hand, let go over `over`; whether the card on the table was lit. */
  function drag(host, card, over) {
    const node = host.querySelector(`[data-card="${card}"]`);
    pointer(node.querySelector("b") ?? node, "pointerdown", 10, 100);
    pointer(node, "pointermove", 10, 60);
    const lit = host.querySelector(".fce-card.top").hasAttribute("data-drop-ok");
    document.elementFromPoint = () => (typeof over === "function" ? over() : over);
    pointer(host, "pointerup", 10, 60);
    return lit;
  }
  // Side 1 to move with the ace of spades, the eight of hearts and the two of hearts; nine of spades on the table.
  async function table() {
    const host = document.createElement("div");
    document.body.append(host);
    const base = context(OPENING);
    const state = { ...base.state, hands: [[1, 2, 3], [0, 20, 14]], pile: [8], suit: 0, next: 1, stock: [40, 41] };
    const ctx = { ...base, state, mySide: 1 };
    board.mount(host, ctx);
    await tick();
    return { host, ctx };
  }

  it("plays a card dragged onto the card on the table, as a tap does, and only the playable ones drag", async () => {
    const { host, ctx } = await table();
    expect([...host.querySelectorAll("[data-drag]")].map((one) => Number(one.dataset.card)).sort((a, b) => a - b)).toEqual([0, 20]);
    expect(drag(host, 0, host.querySelector(".fce-card.top b"))).toBe(true);
    expect(ctx.play).toHaveBeenCalledWith("p0");
  });

  it("asks for the suit of an eight dragged onto the table", async () => {
    const { host, ctx } = await table();
    drag(host, 20, host.querySelector(".fce-card.top"));
    expect(ctx.play).not.toHaveBeenCalled();
    // A real tap: a press, then its click (a click with no press right after a drag is the drag's tail).
    pointer(host.querySelector('.fce-pick [data-suit="c"]'), "pointerdown", 20, 20);
    pointer(host.querySelector('.fce-pick [data-suit="c"]'), "pointerup", 20, 20);
    host.querySelector('.fce-pick [data-suit="c"]').click();
    expect(ctx.play).toHaveBeenCalledWith("p20c");
  });

  it("sends the card back to the hand and plays nothing when it is let go anywhere but the table's card", async () => {
    const { host, ctx } = await table();
    drag(host, 0, host.querySelector('[data-act="draw"]'));
    drag(host, 0, null);
    expect(ctx.play).not.toHaveBeenCalled();
    expect(host.querySelector(".fce-pick")).toBeNull();
  });

  // Seen in Chromium: the card on the table let touches through, so the finger over it found the table.
  it("lets the card on the table be found under the finger, where a dragged card is let go", () => {
    expect(ruleFor(".fce-card.top")).not.toMatch(/pointer-events:\s*none/);
  });

  it("drags nothing off turn, and carries the kit's look for a drag", async () => {
    const host = document.createElement("div");
    board.mount(host, { ...context(OPENING), canPlay: false });
    expect(host.querySelectorAll("[data-drag]")).toHaveLength(0);
    expect(STYLE).toContain(DRAG_STYLE);
  });
});

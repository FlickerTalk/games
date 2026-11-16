import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { DRAG_STYLE } from "../../../kit/src/drag.js";
import { TABLETOP_STYLE } from "../../../kit/src/tabletop/board.js";
import { MARKS, STYLE, board } from "../src/board.js";
import { storeKey } from "../src/roll.js";
import { TEXTS } from "../src/texts.js";
import { ART } from "../src/theme.js";
import { POINTS, commitText, initial, legalMoves, play, result, revealText, seedText, turn } from "../src/rules.js";
import { fromBase64url } from "../src/sha256.js";

const translate = translator(joinTexts(KIT_TEXTS, TEXTS));
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const A = Uint8Array.from({ length: 24 }, (_, at) => at + 1);
const B = new Uint8Array(24).fill(0x5a);
const ROLL = [commitText(A), seedText(B), revealText(A)];
const LIVE = '.fbg [data-to], .fbg [data-from]:not([disabled]), .fbg [data-act="pass"]:not([disabled])';

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

function position(places, { bar = [0, 0], off = [0, 0], next = 0, dice = null } = {}) {
  const state = initial();
  state.points = Array.from({ length: POINTS }, () => [0, 0]);
  for (const [point, side, count] of places) state.points[point][side] = count;
  Object.assign(state, { bar, off, next });
  if (dice) Object.assign(state, { dice, left: dice[0] === dice[1] ? [dice[0], dice[0], dice[0], dice[0]] : [...dice] });
  return state;
}

const realFromPoint = document.elementFromPoint;
afterEach(() => {
  document.elementFromPoint = realFromPoint;
  document.body.innerHTML = "";
});

const pointer = (node, type, x, y) => node.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, isPrimary: true, button: 0, pointerType: "touch" }));
const place = (host, key) => host.querySelector(`button[data-key="${key}"]`);
const keysOf = (nodes) => [...nodes].map((one) => one.dataset.key).sort((a, b) => a.localeCompare(b, "en", { numeric: true }));

function drag(host, from, over) {
  const source = place(host, from);
  pointer(source, "pointerdown", 10, 10);
  pointer(source, "pointermove", 40, 40);
  const lit = keysOf(host.querySelectorAll("[data-drop-ok]"));
  document.elementFromPoint = () => (over === null ? null : place(host, over));
  pointer(host.querySelector('[role="group"]'), "pointerup", 40, 40);
  return lit;
}

async function mounted(ctx) {
  const host = document.createElement("div");
  document.body.append(host);
  const handle = board.mount(host, ctx);
  await tick();
  return { host, handle };
}

let store;
beforeEach(() => {
  store = new Map();
  globalThis.ft = { store: { get: vi.fn(async (key) => store.get(key) ?? null), set: vi.fn(async (key, value) => (store.set(key, value), true)) } };
});

describe("the table", () => {
  it("is drawn on a canvas, with a named button over each point, the bar and the trays, read from the user's seat", async () => {
    const { host } = await mounted(context(ROLL));
    expect(host.querySelector(".fbg canvas").getAttribute("aria-hidden")).toBe("true");
    expect(host.querySelectorAll(".fbg button[data-point]")).toHaveLength(26);
    expect(host.querySelectorAll(".fbg button[data-tray]")).toHaveLength(2);
    expect(place(host, 23).getAttribute("aria-label")).toBe("Point 24: 2 checkers yours");
    expect(place(host, 0).getAttribute("aria-label")).toBe("Point 1: 2 checkers theirs");
    expect(place(host, 22).getAttribute("aria-label")).toBe("Point 23: empty");
    expect(place(host, "bar").getAttribute("aria-label")).toBe("Bar: 0 on it");
    expect(place(host, "off").getAttribute("aria-label")).toBe("Borne off: 0");
    const { dice } = context(ROLL).state;
    expect(host.querySelector('[role="group"]').getAttribute("aria-label")).toBe(`Backgammon · Dice: ${dice[0]} and ${dice[1]}`);
    expect(host.querySelector("button[data-key]").dataset.key).toBe("12");
    expect(host.querySelector(".fbg-nop")).not.toBeNull();
    expect(MARKS).toHaveLength(2);
  });

  it("opens the points a checker may leave, shows where the chosen one may go, and moves it on the second tap", async () => {
    const ctx = context(ROLL);
    const { host } = await mounted(ctx);
    const legal = legalMoves(ctx.state);
    const from = legal[0].from;
    expect(keysOf(host.querySelectorAll("[data-from]"))).toEqual(keysOf([...new Set(legal.map((move) => move.from))].map((one) => place(host, one))));
    expect(host.querySelectorAll("[data-to]")).toHaveLength(0);
    place(host, from).click();
    const targets = legal.filter((move) => move.from === from).map((move) => String(move.to));
    expect(keysOf(host.querySelectorAll("[data-to]"))).toEqual([...new Set(targets)].sort((a, b) => a.localeCompare(b, "en", { numeric: true })));
    const dest = host.querySelector("[data-to]");
    const to = dest.dataset.to;
    dest.click();
    expect(ctx.play).toHaveBeenCalledWith(`m${from}-${to}`);
  });

  it("enters a checker from the bar, bears one off into the tray, and passes on its own when no move is left", async () => {
    const onBar = position([[5, 0, 13], [11, 1, 14], [20, 1, 1]], { bar: [1, 0], dice: [3, 1] });
    const ctx = { ...context([]), state: onBar, mySide: 0, canPlay: true };
    const { host } = await mounted(ctx);
    expect(place(host, "bar").dataset.from).toBe("b");
    place(host, "bar").click();
    expect(host.querySelectorAll("[data-to]").length).toBeGreaterThan(0);
    host.querySelector("[data-to]").click();
    expect(ctx.play.mock.calls[0][0]).toMatch(/^mb-\d+$/);

    const bearing = position([[0, 0, 15], [18, 1, 15]], { dice: [1, 2] });
    const ctx2 = { ...context([]), state: bearing, mySide: 0, canPlay: true };
    const { host: home } = await mounted(ctx2);
    place(home, 0).click();
    const tray = home.querySelector('[data-to="o"]');
    expect(tray.dataset.key).toBe("off");
    tray.click();
    expect(ctx2.play).toHaveBeenCalledWith("m0-o");

    const blocked = position([[0, 0, 2], [1, 0, 2], [2, 0, 2], [3, 0, 2], [4, 0, 2], [5, 0, 2], [20, 0, 3], [11, 1, 14]], { bar: [0, 1], next: 1, dice: [6, 2] });
    const ctx3 = { ...context([]), state: blocked, mySide: 1, canPlay: true };
    const { host: stuck } = await mounted(ctx3);
    await tick();
    expect(ctx3.play).toHaveBeenCalledWith("x");
    expect(stuck.querySelector('[data-act="pass"]').disabled).toBe(false);
  });

  it("once a checker is chosen, finds where it may go before any other checker, so a player tapping the first open place always moves", async () => {
    const bearing = position([[1, 0, 1], [21, 1, 2], [22, 1, 5], [23, 1, 8]], { next: 1, dice: [3, 6] });
    const ctx = { ...context([]), state: bearing, mySide: 1, canPlay: true };
    const { host } = await mounted(ctx);
    host.querySelector(LIVE).click();
    expect(host.querySelector(LIVE).dataset.to).toBeDefined();
    host.querySelector(LIVE).click();
    expect(ctx.play.mock.calls[0][0]).toMatch(/^m2[123]-o$/);
  });

  it("opens nothing off turn, and names things in the user's language", async () => {
    const { host } = await mounted(context(ROLL, { canPlay: false, lang: "es", t: (key, vars) => translate("es", key, vars) }));
    expect(host.querySelectorAll("[data-from]")).toHaveLength(0);
    expect(place(host, 23).getAttribute("aria-label")).toBe("Punto 24: 2 fichas tuyas");
  });
});

describe("the roll", () => {
  it("commits on its own as the side to move, keeping the seed, then reveals it", async () => {
    const ctx = context([], { mySide: 0 });
    const { handle } = await mounted(ctx);
    await tick();
    expect(ctx.play).toHaveBeenCalledTimes(1);
    const commit = ctx.play.mock.calls[0][0];
    const seed = fromBase64url(store.get(storeKey("me-1", "0/0")));
    expect(commitText(seed)).toBe(commit);
    ctx.play.mockClear();
    handle.update({ ...context([commit, seedText(B)], { mySide: 0 }), play: ctx.play });
    await tick();
    expect(ctx.play).toHaveBeenCalledWith(revealText(seed));
  });

  it("says so when its own seed is lost", async () => {
    const stuck = context(ROLL.slice(0, 2), { mySide: 0 });
    const { host } = await mounted(stuck);
    await tick();
    expect(stuck.play).not.toHaveBeenCalled();
    expect(stuck.notify).toHaveBeenCalledWith(expect.stringContaining("The roll was lost"));
    expect(host.textContent).not.toContain("The roll was lost");
  });
});

describe("dragging a checker", () => {
  it("moves a checker dragged from its point to a legal one, lighting the places it may reach, as the two taps do", async () => {
    const ctx = context(ROLL);
    const { host } = await mounted(ctx);
    const legal = legalMoves(ctx.state);
    const from = legal[0].from;
    const targets = [...new Set(legal.filter((move) => move.from === from).map((move) => String(move.to)))];
    expect(place(host, from).hasAttribute("data-drag")).toBe(true);
    expect(drag(host, from, targets[0])).toEqual([...targets].sort((a, b) => a.localeCompare(b, "en", { numeric: true })));
    expect(ctx.play).toHaveBeenCalledWith(`m${from}-${targets[0]}`);
  });

  it("sends the checker back and moves nothing when it is let go where it may not go, or off the table", async () => {
    const ctx = context(ROLL);
    const { host } = await mounted(ctx);
    const legal = legalMoves(ctx.state);
    const from = legal[0].from;
    const reachable = new Set(legal.filter((move) => move.from === from).map((move) => move.to));
    const far = [...Array(POINTS).keys()].find((point) => !reachable.has(point) && point !== from);
    drag(host, from, far);
    drag(host, from, null);
    expect(ctx.play).not.toHaveBeenCalled();
  });

  it("enters a checker dragged from the bar, and bears one off dragged onto the tray", async () => {
    const onBar = position([[5, 0, 13], [11, 1, 14], [20, 1, 1]], { bar: [1, 0], dice: [3, 1] });
    const ctx = { ...context([]), state: onBar, mySide: 0, canPlay: true };
    const { host } = await mounted(ctx);
    const entry = legalMoves(onBar).find((move) => move.from === "b").to;
    drag(host, "bar", entry);
    expect(ctx.play).toHaveBeenCalledWith(`mb-${entry}`);

    const bearing = position([[0, 0, 15], [18, 1, 15]], { dice: [1, 2] });
    const ctx2 = { ...context([]), state: bearing, mySide: 0, canPlay: true };
    const { host: home } = await mounted(ctx2);
    expect(drag(home, 0, "off")).toContain("off");
    expect(ctx2.play).toHaveBeenCalledWith("m0-o");
  });

  it("drags nothing off turn, and carries the kit's look for a canvas board and a drag", async () => {
    const { host } = await mounted(context(ROLL, { canPlay: false }));
    expect(host.querySelectorAll("[data-drag]")).toHaveLength(0);
    expect(STYLE).toContain(TABLETOP_STYLE);
    expect(STYLE).toContain(DRAG_STYLE);
  });

  it("outlines the player whose turn it is in the colour of that side's checkers", () => {
    expect(STYLE).toContain(`.ftg{--hue-side-0:${ART.sides[0]};--hue-side-1:${ART.sides[1]}}`);
  });
});

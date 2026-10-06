// The board of Backgammon: the roll made on its own (the roller's seed kept in the store), the
// points with their checkers, a checker moved in two taps (its point, then a finger-sized target
// on the destination), the bar and the trays, the dice and the pips, and a pass with no move.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { DRAG_STYLE } from "../../../kit/src/drag.js";
import { MARKS, STYLE, board, storeKey } from "../src/board.js";
import { TEXTS } from "../src/texts.js";
import { POINTS, commitText, initial, legalMoves, play, result, revealText, seedText, turn } from "../src/rules.js";
import { fromBase64url } from "../src/sha256.js";

const translate = translator(joinTexts(KIT_TEXTS, TEXTS));
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const A = Uint8Array.from({ length: 24 }, (_, at) => at + 1);
const B = new Uint8Array(24).fill(0x5a);
const ROLL = [commitText(A), seedText(B), revealText(A)];

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
  state.bar = bar;
  state.off = off;
  state.next = next;
  if (dice) {
    state.dice = dice;
    state.left = dice[0] === dice[1] ? [dice[0], dice[0], dice[0], dice[0]] : [...dice];
  }
  return state;
}

const realFromPoint = document.elementFromPoint;
afterEach(() => {
  document.elementFromPoint = realFromPoint;
  document.body.innerHTML = "";
});

const pointer = (node, type, x, y) => node.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, isPrimary: true, button: 0, pointerType: "touch" }));

/** A finger on the top checker of `source` (a point's or the bar's button), let go over `over`; the lit places, as their points. */
function drag(host, source, over) {
  const checker = [...source.querySelectorAll(".fbg-checker")].at(-1) ?? source;
  pointer(checker, "pointerdown", 10, 10);
  pointer(checker, "pointermove", 40, 40);
  const lit = [...host.querySelectorAll("[data-drop-ok]")].map((one) => one.dataset.point ?? (one.classList.contains("fbg-tray") ? "o" : one.dataset.to));
  document.elementFromPoint = () => over;
  pointer(host, "pointerup", 40, 40);
  return lit;
}

/** A board mounted in the document, where a drag looks for what is under the finger. */
async function mounted(ctx) {
  const host = document.createElement("div");
  document.body.append(host);
  board.mount(host, ctx);
  await tick();
  return host;
}

let store;
beforeEach(() => {
  store = new Map();
  globalThis.ft = { store: { get: vi.fn(async (key) => store.get(key) ?? null), set: vi.fn(async (key, value) => (store.set(key, value), true)) } };
});

describe("the roll", () => {
  it("commits on its own as the side to move, keeping the seed, then reveals it", async () => {
    const host = document.createElement("div");
    const ctx = context([], { mySide: 0 });
    const mounted = board.mount(host, ctx);
    await tick();
    await tick();
    expect(host.textContent).toContain("Rolling the dice");
    expect(ctx.play).toHaveBeenCalledTimes(1);
    const commit = ctx.play.mock.calls[0][0];
    expect(commit).toMatch(/^c[A-Za-z0-9_-]{43}$/);
    const seed = fromBase64url(store.get(storeKey("me-1", "0/0")));
    expect(commitText(seed)).toBe(commit);
    ctx.play.mockClear();
    mounted.update({ ...context([commit, seedText(B)], { mySide: 0 }), play: ctx.play });
    await tick();
    expect(ctx.play).toHaveBeenCalledWith(revealText(seed));
  });

  it("answers a commitment with a seed as the other side, and says so when its own seed is lost", async () => {
    const host = document.createElement("div");
    const ctx = context([ROLL[0]], { mySide: 1 });
    board.mount(host, ctx);
    await tick();
    await tick();
    expect(ctx.play).toHaveBeenCalledTimes(1);
    expect(ctx.play.mock.calls[0][0]).toMatch(/^s[A-Za-z0-9_-]{32}$/);
    const lost = document.createElement("div");
    const stuck = context(ROLL.slice(0, 2), { mySide: 0 });
    board.mount(lost, stuck);
    await tick();
    await tick();
    expect(stuck.play).not.toHaveBeenCalled();
    expect(stuck.notify).toHaveBeenCalledWith(expect.stringContaining("The roll was lost"));
    expect(lost.textContent).not.toContain("The roll was lost");
  });
});

describe("the table", () => {
  it("draws the twenty-four points with their checkers, the bar, the trays, the dice and the pips", async () => {
    const host = document.createElement("div");
    const ctx = context(ROLL);
    board.mount(host, ctx);
    await tick();
    expect(host.querySelectorAll(".fbg-point")).toHaveLength(24);
    expect(host.querySelectorAll(".fbg-checker")).toHaveLength(2 + 5 + 3 + 5 + 2 + 5 + 3 + 5);
    expect(host.querySelector('[data-point="23"]').getAttribute("aria-label")).toBe("Point 24: 2 checkers yours");
    expect(host.querySelector('[data-point="0"]').getAttribute("aria-label")).toBe("Point 1: 2 checkers theirs");
    expect(host.querySelector('[data-point="22"]').getAttribute("aria-label")).toBe("Point 23: empty");
    expect(host.querySelectorAll(".fbg-die")).toHaveLength(2);
    expect(host.querySelector(".fbg-dice").getAttribute("aria-label")).toBe(`Dice: ${ctx.state.dice[0]} and ${ctx.state.dice[1]}`);
    expect(host.querySelector(".fbg-pips").textContent).toContain("167");
    expect(host.querySelectorAll(".fbg-tray")).toHaveLength(2);
    expect(MARKS).toHaveLength(2);
  });

  it("opens the points a checker may move from, shows the destinations on a tap, and moves on the second", async () => {
    const host = document.createElement("div");
    const ctx = context(ROLL);
    board.mount(host, ctx);
    await tick();
    const legal = legalMoves(ctx.state);
    const from = legal[0].from;
    const sources = new Set(legal.map((move) => move.from));
    expect([...host.querySelectorAll("[data-from]")].map((one) => (one.dataset.from === "b" ? "b" : Number(one.dataset.from))).sort()).toEqual([...sources].sort());
    expect(host.querySelectorAll(".fbg-dest")).toHaveLength(0);
    host.querySelector(`[data-from="${from}"]`).click();
    const targets = legal.filter((move) => move.from === from && move.to !== "o").map((move) => move.to);
    const dests = [...host.querySelectorAll(".fbg-dest")].map((one) => Number(one.dataset.to));
    expect([...dests].sort()).toEqual([...targets].sort());
    host.querySelector(".fbg-dest").click();
    expect(ctx.play).toHaveBeenCalledWith(`m${from}-${dests[0]}`);
  });

  it("enters from the bar, bears off into the tray, and passes on its own with no move", async () => {
    const host = document.createElement("div");
    const onBar = position([[5, 0, 13], [11, 1, 14], [20, 1, 1]], { bar: [1, 0], dice: [3, 1] });
    const ctx = { ...context([]), state: onBar, mySide: 0, canPlay: true };
    board.mount(host, ctx);
    await tick();
    expect(host.querySelector('[data-from="b"]')).not.toBeNull();
    host.querySelector('[data-from="b"]').click();
    expect(host.querySelectorAll(".fbg-dest").length).toBeGreaterThan(0);
    host.querySelector(".fbg-dest").click();
    expect(ctx.play.mock.calls[0][0]).toMatch(/^mb-\d+$/);

    const bearing = position([[0, 0, 15], [18, 1, 15]], { dice: [1, 2] });
    const home = document.createElement("div");
    const ctx2 = { ...context([]), state: bearing, mySide: 0, canPlay: true };
    board.mount(home, ctx2);
    await tick();
    home.querySelector('[data-from="0"]').click();
    const tray = home.querySelector('[data-to="o"]');
    expect(tray).not.toBeNull();
    tray.click();
    expect(ctx2.play).toHaveBeenCalledWith("m0-o");

    const blocked = position([[0, 0, 2], [1, 0, 2], [2, 0, 2], [3, 0, 2], [4, 0, 2], [5, 0, 2], [20, 0, 3], [11, 1, 14]], { bar: [0, 1], next: 1, dice: [6, 2] });
    const stuck = document.createElement("div");
    const ctx3 = { ...context([]), state: blocked, mySide: 1, canPlay: true };
    board.mount(stuck, ctx3);
    await tick();
    await tick();
    expect(ctx3.play).toHaveBeenCalledWith("x");
  });

  it("opens nothing off turn, and names things in the user's language", async () => {
    const host = document.createElement("div");
    const ctx = context(ROLL, { canPlay: false, lang: "es", t: (key, vars) => translate("es", key, vars) });
    board.mount(host, ctx);
    await tick();
    expect(host.querySelectorAll("[data-from]")).toHaveLength(0);
    expect(host.querySelector('[data-point="23"]').getAttribute("aria-label")).toBe("Punto 24: 2 fichas tuyas");
  });
});

describe("dragging a checker", () => {
  it("moves a checker dragged from its point to a legal one, lighting the points it may reach, as the two taps do", async () => {
    const ctx = context(ROLL);
    const host = await mounted(ctx);
    const legal = legalMoves(ctx.state);
    const from = legal[0].from;
    const targets = legal.filter((move) => move.from === from).map((move) => String(move.to));
    const source = host.querySelector(`[data-from="${from}"]`);
    expect(source.hasAttribute("data-drag")).toBe(true);
    const to = targets[0];
    const lit = drag(host, source, host.querySelector(`[data-point="${to}"]`));
    expect([...new Set(lit)].sort()).toEqual([...new Set(targets)].sort());
    expect(ctx.play).toHaveBeenCalledWith(`m${from}-${to}`);
  });

  it("lands on the finger-sized target of a point too, when a tap had chosen the checker first", async () => {
    const ctx = context(ROLL);
    const host = await mounted(ctx);
    const from = legalMoves(ctx.state)[0].from;
    pointer(host.querySelector(`[data-from="${from}"]`), "pointerdown", 10, 10);
    pointer(host.querySelector(`[data-from="${from}"]`), "pointerup", 10, 10);
    host.querySelector(`[data-from="${from}"]`).click();
    const dest = host.querySelector(".fbg-dest");
    drag(host, host.querySelector(`[data-from="${from}"]`), dest);
    expect(ctx.play).toHaveBeenCalledWith(`m${from}-${dest.dataset.to}`);
  });

  it("sends the checker back and moves nothing when it is let go on a point it may not reach, or off the table", async () => {
    const ctx = context(ROLL);
    const host = await mounted(ctx);
    const legal = legalMoves(ctx.state);
    const from = legal[0].from;
    const reachable = new Set(legal.filter((move) => move.from === from).map((move) => move.to));
    const far = [...Array(POINTS).keys()].find((point) => !reachable.has(point) && point !== from);
    drag(host, host.querySelector(`[data-from="${from}"]`), host.querySelector(`[data-point="${far}"]`));
    drag(host, host.querySelector(`[data-from="${from}"]`), null);
    expect(ctx.play).not.toHaveBeenCalled();
  });

  it("enters a checker dragged from the bar, and bears one off dragged onto the tray", async () => {
    const onBar = position([[5, 0, 13], [11, 1, 14], [20, 1, 1]], { bar: [1, 0], dice: [3, 1] });
    const ctx = { ...context([]), state: onBar, mySide: 0, canPlay: true };
    const host = await mounted(ctx);
    const entry = legalMoves(onBar).find((move) => move.from === "b").to;
    drag(host, host.querySelector('[data-from="b"]'), host.querySelector(`[data-point="${entry}"]`));
    expect(ctx.play).toHaveBeenCalledWith(`mb-${entry}`);

    const bearing = position([[0, 0, 15], [18, 1, 15]], { dice: [1, 2] });
    const ctx2 = { ...context([]), state: bearing, mySide: 0, canPlay: true };
    const home = await mounted(ctx2);
    const tray = home.querySelectorAll(".fbg-tray")[1];
    expect(drag(home, home.querySelector('[data-from="0"]'), tray)).toContain("o");
    expect(ctx2.play).toHaveBeenCalledWith("m0-o");
  });

  it("drags nothing off turn, and carries the kit's look for a drag", async () => {
    const host = await mounted(context(ROLL, { canPlay: false }));
    expect(host.querySelectorAll("[data-drag]")).toHaveLength(0);
    expect(STYLE).toContain(DRAG_STYLE);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { DRAG_STYLE } from "../../../kit/src/drag.js";
import { TABLETOP_STYLE } from "../../../kit/src/tabletop/board.js";
import { board, PIECES, STYLE } from "../src/board.js";
import { TEXTS } from "../src/texts.js";
import { ART } from "../src/theme.js";
import { initial, play, result, turn } from "../src/rules.js";

const translate = translator(joinTexts(KIT_TEXTS, TEXTS));

function fromRows(rows, next) {
  const marks = { d: 0, l: 1, D: 2, L: 3 };
  return { cells: rows.join("").split("").map((mark) => (mark in marks ? marks[mark] : null)), next, quiet: 0 };
}

function context(state, extra = {}) {
  const over = result(state);
  return {
    state,
    mySide: turn(state),
    canPlay: !over,
    last: null,
    pending: false,
    result: over ? { k: "rules", winner: over.winner, result: over } : null,
    lang: "en",
    t: (key, vars) => translate("en", key, vars),
    play: vi.fn(),
    ...extra,
  };
}

function mount(ctx) {
  const host = document.createElement("div");
  host.getBoundingClientRect = () => ({ left: 0, top: 0, width: 352, height: 352, right: 352, bottom: 352 });
  document.body.append(host);
  const mounted = board.mount(host, ctx);
  return { host, mounted };
}

const realFromPoint = document.elementFromPoint;
afterEach(() => {
  document.elementFromPoint = realFromPoint;
  document.body.innerHTML = "";
});

const pointer = (node, type, x, y) => node.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, isPrimary: true, button: 0, pointerType: "touch" }));

function drag(host, from, to) {
  const piece = square(host, from);
  pointer(piece, "pointerdown", 10, 10);
  pointer(piece, "pointermove", 40, 40);
  const lit = [...host.querySelectorAll("[data-drop-ok]")].map((one) => Number(one.dataset.cell)).sort((a, b) => a - b);
  document.elementFromPoint = () => (to === null ? null : square(host, to));
  pointer(host.querySelector('[role="group"]'), "pointerup", 40, 40);
  return lit;
}

const square = (host, index) => host.querySelector(`button[data-cell="${index}"]`);
const marked = (host, name) => [...host.querySelectorAll("button[data-mark]")].filter((one) => one.dataset.mark.split(" ").includes(name)).map((one) => Number(one.dataset.cell)).sort((a, b) => a - b);
const enabled = (host) => [...host.querySelectorAll("button[data-cell]")].filter((one) => !one.disabled).map((one) => Number(one.dataset.cell)).sort((a, b) => a - b);

describe("the board", () => {
  it("is drawn on a canvas, with the dark squares as named buttons over it, counted for a screen reader", () => {
    const { host } = mount(context(initial()));
    expect(host.querySelector("canvas").getAttribute("aria-hidden")).toBe("true");
    expect(host.querySelectorAll("button[data-cell]")).toHaveLength(32);
    expect(host.querySelector('[role="group"]').getAttribute("aria-label")).toBe("Board: 12 dark, 12 light");
    expect(square(host, 1).getAttribute("aria-label")).toBe("Row 1, column 2: dark piece");
    expect(square(host, 62).getAttribute("aria-label")).toBe("Row 8, column 7: light piece");
    expect(square(host, 28).getAttribute("aria-label")).toBe("Row 4, column 5: empty");
    expect(PIECES).toHaveLength(2);
    expect(host.querySelector("button[data-cell]").dataset.cell).toBe("62");
    expect([...host.querySelectorAll("button[data-cell]")].at(-1).dataset.cell).toBe("1");
  });

  it("opens the pieces that may move, then the squares the chosen one may go to, and plays the whole move", () => {
    const ctx = context(initial());
    const { host } = mount(ctx);
    expect(enabled(host)).toEqual([17, 19, 21, 23]);
    expect(square(host, 1).disabled).toBe(true);
    square(host, 21).click();
    expect(marked(host, "from")).toEqual([21]);
    expect(marked(host, "to")).toEqual([28, 30]);
    expect(ctx.play).not.toHaveBeenCalled();
    square(host, 30).click();
    expect(ctx.play).toHaveBeenCalledWith("21-30");
  });

  it("chains the jumps of a capture before playing it, and starts over on a second tap of the piece", () => {
    const ctx = context(fromRows(["........", "........", ".....d..", "....l...", "........", "..l.....", "........", "........"], 0));
    const { host } = mount(ctx);
    expect(enabled(host)).toEqual([21]);
    expect(marked(host, "forced")).toEqual([21]);
    square(host, 21).click();
    expect(marked(host, "to")).toEqual([35]);
    square(host, 35).click();
    expect(ctx.play).not.toHaveBeenCalled();
    expect(marked(host, "from")).toEqual([21, 35]);
    expect(marked(host, "to")).toEqual([49]);
    square(host, 21).click();
    expect(marked(host, "from")).toEqual([]);
    square(host, 21).click();
    square(host, 35).click();
    square(host, 49).click();
    expect(ctx.play).toHaveBeenCalledWith("21-35-49");
  });

  it("keeps the numbering for the light side, whose pieces start on the bottom rows, opens nothing out of turn, and speaks the user's language", () => {
    const { host } = mount(context(initial(), { mySide: 1, canPlay: false, lang: "es", t: (key, vars) => translate("es", key, vars) }));
    expect(host.querySelector("button[data-cell]").dataset.cell).toBe("1");
    expect(enabled(host)).toEqual([]);
    expect(square(host, 62).getAttribute("aria-label")).toBe("Fila 8, columna 7: ficha clara");
    expect(host.querySelector('[role="group"]').getAttribute("aria-label")).toBe("Tablero: 12 oscuras, 12 claras");
  });

  it("marks the last move, a pending one, and names a king", () => {
    const moved = play(initial(), "21-30", 0).state;
    const { host, mounted } = mount(context(initial()));
    mounted.update(context(moved, { mySide: 0, canPlay: false, last: "21-30", pending: true }));
    expect(marked(host, "last")).toEqual([21, 30]);
    expect(marked(host, "pending")).toEqual([30]);
    mounted.update(context(moved, { mySide: 0, canPlay: false, last: "21-30" }));
    expect(marked(host, "pending")).toEqual([]);
    mounted.update(context(fromRows(["........", "........", "........", "....D...", "........", "........", "........", "........"], 0)));
    expect(square(host, 28).getAttribute("aria-label")).toBe("Row 4, column 5: dark king");
  });

  it("plays a move by dragging the piece to a legal square, lighting where it may go, as the taps do", () => {
    const ctx = context(initial());
    const { host } = mount(ctx);
    expect([...host.querySelectorAll("[data-drag]")].map((one) => Number(one.dataset.cell)).sort((a, b) => a - b)).toEqual([17, 19, 21, 23]);
    expect(drag(host, 21, 30)).toEqual([28, 30]);
    expect(ctx.play).toHaveBeenCalledWith("21-30");
  });

  it("sends the piece back and plays nothing when it is let go on a square it may not reach, or off the board", () => {
    const ctx = context(initial());
    const { host } = mount(ctx);
    drag(host, 21, 37);
    drag(host, 21, null);
    expect(ctx.play).not.toHaveBeenCalled();
    expect(marked(host, "from")).toEqual([]);
  });

  it("plays a whole capture dragged to where it ends, and stops halfway when dropped on a square between", () => {
    const rows = ["........", "........", ".....d..", "....l...", "........", "..l.....", "........", "........"];
    const ctx = context(fromRows(rows, 0));
    const { host } = mount(ctx);
    expect(drag(host, 21, 49)).toEqual([35, 49]);
    expect(ctx.play).toHaveBeenCalledWith("21-35-49");
    document.body.innerHTML = "";

    const ctx2 = context(fromRows(rows, 0));
    const { host: half } = mount(ctx2);
    drag(half, 21, 35);
    expect(ctx2.play).not.toHaveBeenCalled();
    expect(marked(half, "from")).toEqual([21, 35]);
    pointer(square(half, 49), "pointerdown", 60, 60);
    pointer(square(half, 49), "pointerup", 60, 60);
    square(half, 49).click();
    expect(ctx2.play).toHaveBeenCalledWith("21-35-49");
  });

  it("drags nothing out of turn, and carries the kit's look for a canvas board and a drag", () => {
    const { host } = mount(context(initial(), { canPlay: false }));
    expect(host.querySelectorAll("[data-drag]")).toHaveLength(0);
    expect(STYLE).toContain(TABLETOP_STYLE);
    expect(STYLE).toContain(DRAG_STYLE);
  });

  it("outlines the player whose turn it is in the colour of that side's pieces", () => {
    expect(STYLE).toContain(`.ftg{--hue-side-0:${ART.pieces[0].body};--hue-side-1:${ART.pieces[1].body}}`);
  });
});

// The board of checkers: the dark squares are buttons named for a screen reader in the user's
// language, the pieces in SVG with a crown ring on a king; only the pieces that may move are open;
// a move takes the piece and then its squares, jump after jump, and is played when whole; the
// board is turned around for the light side; the last move marked, a pending one too.
import { describe, expect, it, vi } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { board, PIECES } from "../src/board.js";
import { TEXTS } from "../src/texts.js";
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

const square = (host, index) => host.querySelector(`[data-cell="${index}"]`);
const classesOf = (host, name) => [...host.querySelectorAll(`.fck-sq.${name}`)].map((one) => Number(one.dataset.cell)).sort((a, b) => a - b);

describe("the board", () => {
  it("has the dark squares as named buttons with the pieces, counted for a screen reader", () => {
    const host = document.createElement("div");
    board.mount(host, context(initial()));
    expect(host.querySelectorAll("button.fck-sq")).toHaveLength(32);
    expect(host.querySelectorAll(".fck-sq")).toHaveLength(64);
    expect(host.querySelector('[role="group"]').getAttribute("aria-label")).toBe("Board: 12 dark, 12 light");
    expect(square(host, 1).getAttribute("aria-label")).toBe("Row 1, column 2: dark piece");
    expect(square(host, 62).getAttribute("aria-label")).toBe("Row 8, column 7: light piece");
    expect(square(host, 28).getAttribute("aria-label")).toBe("Row 4, column 5: empty");
    expect(square(host, 1).querySelector("svg.fck-s0")).not.toBeNull();
    expect(PIECES).toHaveLength(2);
    // The dark side sees itself at the top, as the squares are numbered: the first button is square 1.
    expect(host.querySelector("button.fck-sq").dataset.cell).toBe("1");
  });

  it("opens the pieces that may move, then the squares the chosen one may go to, and plays the whole move", () => {
    const host = document.createElement("div");
    const ctx = context(initial());
    board.mount(host, ctx);
    expect(classesOf(host, "can")).toEqual([17, 19, 21, 23]);
    expect(square(host, 1).disabled).toBe(true);
    square(host, 21).click();
    expect(classesOf(host, "from")).toEqual([21]);
    expect(classesOf(host, "to")).toEqual([28, 30]);
    expect(ctx.play).not.toHaveBeenCalled();
    square(host, 30).click();
    expect(ctx.play).toHaveBeenCalledWith("21-30");
  });

  it("chains the jumps of a capture before playing it, and starts over on a second tap of the piece", () => {
    const host = document.createElement("div");
    const ctx = context(fromRows(["........", "........", ".....d..", "....l...", "........", "..l.....", "........", "........"], 0));
    board.mount(host, ctx);
    expect(classesOf(host, "can")).toEqual([21]);
    square(host, 21).click();
    expect(classesOf(host, "to")).toEqual([35]);
    square(host, 35).click();
    expect(ctx.play).not.toHaveBeenCalled();
    expect(classesOf(host, "from")).toEqual([21, 35]);
    expect(classesOf(host, "to")).toEqual([49]);
    square(host, 21).click();
    expect(classesOf(host, "from")).toEqual([]);
    square(host, 21).click();
    square(host, 35).click();
    square(host, 49).click();
    expect(ctx.play).toHaveBeenCalledWith("21-35-49");
  });

  it("turns the board around for the light side, opens nothing out of turn, and speaks the user's language", () => {
    const host = document.createElement("div");
    board.mount(host, context(initial(), { mySide: 1, canPlay: false, lang: "es", t: (key, vars) => translate("es", key, vars) }));
    expect(host.querySelector("button.fck-sq").dataset.cell).toBe("62");
    expect(host.querySelectorAll(".fck-sq:enabled")).toHaveLength(0);
    expect(square(host, 62).getAttribute("aria-label")).toBe("Fila 8, columna 7: ficha clara");
    expect(host.querySelector('[role="group"]').getAttribute("aria-label")).toBe("Tablero: 12 oscuras, 12 claras");
  });

  it("marks the last move, a pending one with a clock, and a king with its crown", () => {
    const host = document.createElement("div");
    const moved = play(initial(), "21-30", 0).state;
    const mounted = board.mount(host, context(initial()));
    mounted.update(context(moved, { mySide: 0, canPlay: false, last: "21-30", pending: true }));
    expect(classesOf(host, "last")).toEqual([21, 30]);
    expect(square(host, 30).querySelector(".fck-clock")).not.toBeNull();
    mounted.update(context(moved, { mySide: 0, canPlay: false, last: "21-30" }));
    expect(square(host, 30).querySelector(".fck-clock")).toBeNull();
    const king = fromRows(["........", "........", "........", "....D...", "........", "........", "........", "........"], 0);
    mounted.update(context(king));
    expect(square(host, 28).querySelector("svg .crown")).not.toBeNull();
    expect(square(host, 28).getAttribute("aria-label")).toBe("Row 4, column 5: dark king");
  });
});

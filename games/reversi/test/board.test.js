// The board of Reversi: sixty-four cells, each a button with a name a screen reader says in the
// user's language, the discs in SVG in each side's colour, only the cells the user may play open
// (and dotted), the last disc ringed, a move that has not reached the other phone pending, the
// discs just turned flipping over.
import { describe, expect, it, vi } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { board, DISCS } from "../src/board.js";
import { TEXTS } from "../src/texts.js";
import { initial, play, result, turn } from "../src/rules.js";

const translate = translator(joinTexts(KIT_TEXTS, TEXTS));

function context(cells, extra = {}) {
  let state = initial();
  for (const cell of cells) state = play(state, cell, turn(state)).state;
  const over = result(state);
  return {
    state,
    mySide: turn(state),
    canPlay: !over,
    last: cells.at(-1) ?? null,
    pending: false,
    result: over ? { k: "rules", winner: over.winner, result: over } : null,
    lang: "en",
    t: (key, vars) => translate("en", key, vars),
    play: vi.fn(),
    ...extra,
  };
}

const cell = (host, index) => host.querySelector(`[data-cell="${index}"]`);

describe("the board", () => {
  it("has sixty-four cells, named with their disc, and counts the discs for a screen reader", () => {
    const host = document.createElement("div");
    board.mount(host, context([]));
    expect(host.querySelectorAll("button.frv-cell")).toHaveLength(64);
    expect(host.querySelector('[role="group"]').getAttribute("aria-label")).toBe("Board: 2 dark, 2 light");
    expect(cell(host, 27).getAttribute("aria-label")).toBe("Row 4, column 4: light");
    expect(cell(host, 28).getAttribute("aria-label")).toBe("Row 4, column 5: dark");
    expect(cell(host, 0).getAttribute("aria-label")).toBe("Row 1, column 1: empty");
    expect(cell(host, 28).querySelector("svg.frv-s0")).not.toBeNull();
    expect(cell(host, 27).querySelector("svg.frv-s1")).not.toBeNull();
    expect(DISCS).toHaveLength(2);
  });

  it("opens only the cells the user may play, dotted, and plays one on a tap", () => {
    const host = document.createElement("div");
    const ctx = context([]);
    board.mount(host, ctx);
    expect([...host.querySelectorAll(".frv-cell.legal")].map((one) => Number(one.dataset.cell))).toEqual([19, 26, 37, 44]);
    expect(cell(host, 19).disabled).toBe(false);
    expect(cell(host, 0).disabled).toBe(true);
    cell(host, 19).click();
    expect(ctx.play).toHaveBeenCalledWith(19);
    cell(host, 0).click();
    expect(ctx.play).toHaveBeenCalledTimes(1);
  });

  it("opens nothing when it is not the user's turn, and names the cells in their language", () => {
    const host = document.createElement("div");
    board.mount(host, context([], { canPlay: false, lang: "es", t: (key, vars) => translate("es", key, vars) }));
    expect(host.querySelectorAll(".frv-cell.legal")).toHaveLength(0);
    expect(host.querySelectorAll(".frv-cell:enabled")).toHaveLength(0);
    expect(cell(host, 27).getAttribute("aria-label")).toBe("Fila 4, columna 4: clara");
  });

  it("rings the last disc, marks a pending one, and flips the discs a move turned", () => {
    const host = document.createElement("div");
    const mounted = board.mount(host, context([]));
    mounted.update(context([19], { pending: true }));
    expect(cell(host, 19).classList.contains("last")).toBe(true);
    expect(cell(host, 19).querySelector(".frv-clock")).not.toBeNull();
    // The disc at 27 turned from light to dark: it flips; the new disc at 19 does not.
    expect(cell(host, 27).classList.contains("flip")).toBe(true);
    expect(cell(host, 19).classList.contains("flip")).toBe(false);
    mounted.update(context([19]));
    expect(cell(host, 19).querySelector(".frv-clock")).toBeNull();
    expect(host.querySelectorAll(".flip")).toHaveLength(0);
  });
});

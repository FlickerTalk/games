// The board of Tic-Tac-Toe: nine cells the user touches, drawn in SVG, each with a name a screen
// reader says in the user's language; the last move marked, a move that has not gone out marked
// as pending, and the winning line drawn across.
import { describe, expect, it, vi } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { checkTexts } from "../../../kit/test/helpers.js";
import { board, MARKS } from "../src/board.js";
import { TEXTS } from "../src/i18n.js";
import { initial, play } from "../src/rules.js";

const translate = translator(joinTexts(KIT_TEXTS, TEXTS));

function context(cells, extra = {}) {
  let state = initial();
  for (const cell of cells) state = play(state, cell, state.cells.filter((one) => one !== null).length % 2).state;
  return { state, canPlay: true, last: cells.at(-1) ?? null, pending: false, result: null, lang: "en", t: (key, vars) => translate("en", key, vars), play: vi.fn(), ...extra };
}

describe("the board", () => {
  it("has nine cells, named by row and column, empty or with their mark", () => {
    const host = document.createElement("div");
    board.mount(host, context([4, 0]));
    const cells = host.querySelectorAll("button.ftt-cell");
    expect(cells).toHaveLength(9);
    expect(host.querySelector('[role="group"]').getAttribute("aria-label")).toBe("Board");
    expect(cells[0].getAttribute("aria-label")).toBe("Row 1, column 1: O");
    expect(cells[4].getAttribute("aria-label")).toBe("Row 2, column 2: X");
    expect(cells[8].getAttribute("aria-label")).toBe("Row 3, column 3: empty");
    expect(cells[4].querySelector("svg.ftt-x")).not.toBeNull();
    expect(cells[0].querySelector("svg.ftt-o")).not.toBeNull();
    expect(cells[0].classList.contains("last")).toBe(true);
  });

  it("plays an empty cell when it is the user's turn, and nothing else", () => {
    const host = document.createElement("div");
    const ctx = context([4]);
    board.mount(host, ctx);
    host.querySelectorAll("button.ftt-cell")[4].click();
    expect(ctx.play).not.toHaveBeenCalled();
    host.querySelectorAll("button.ftt-cell")[2].click();
    expect(ctx.play).toHaveBeenCalledWith(2);
    const waiting = context([4], { canPlay: false });
    const shown = board.mount(host, waiting);
    host.querySelectorAll("button.ftt-cell")[2].click();
    expect(waiting.play).not.toHaveBeenCalled();
    expect(host.querySelectorAll("button.ftt-cell:disabled")).toHaveLength(9);
    // Told of a change, it draws it.
    shown.update(context([4, 2], { canPlay: true }));
    expect(host.querySelectorAll("button.ftt-cell")[2].querySelector("svg.ftt-o")).not.toBeNull();
  });

  it("marks a move that has not reached the other phone, and draws the winning line", () => {
    const host = document.createElement("div");
    const shown = board.mount(host, context([0, 3, 1], { pending: true, canPlay: false }));
    expect(host.querySelectorAll("button.ftt-cell")[1].querySelector(".ftt-clock")).not.toBeNull();
    shown.update(context([0, 3, 1, 4, 2], { canPlay: false, result: { k: "rules", result: { winner: 0, line: [0, 1, 2] } } }));
    const line = host.querySelector("svg.ftt-win line");
    expect(line).not.toBeNull();
    expect(line.getAttribute("class")).toContain("ftt-x");
    expect(host.querySelectorAll(".ftt-cell.win")).toHaveLength(3);
  });

  it("lends its marks to the players' chips", () => {
    expect(MARKS[0]).toContain("ftt-x");
    expect(MARKS[1]).toContain("ftt-o");
  });
});

describe("the texts", () => {
  it("speak the 21 languages, the kit's and the game's together", () => {
    checkTexts(joinTexts(KIT_TEXTS, TEXTS));
    expect(translate("es", "name")).toBe("Tres en raya");
    expect(translate("ja", "cell", { row: 1, col: 2 })).toBe("1行2列");
  });
});

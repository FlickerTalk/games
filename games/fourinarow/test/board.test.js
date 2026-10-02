// The board of Four in a Row: seven columns the user touches (the whole column is the target),
// each a button with a name a screen reader says in the user's language; the discs in SVG with a
// mark of their side, so colour is never the only difference; the last disc marked, and dropped in
// only when it is new; a move that has not reached the other phone marked as pending; the winning
// four marked.
import { describe, expect, it, vi } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { board, DISCS } from "../src/board.js";
import { TEXTS } from "../src/texts.js";
import { initial, play, result, turn } from "../src/rules.js";

const translate = translator(joinTexts(KIT_TEXTS, TEXTS));

function context(columns, extra = {}) {
  let state = initial();
  for (const column of columns) state = play(state, column, turn(state)).state;
  const over = result(state);
  return {
    state,
    mySide: 0,
    canPlay: !over,
    last: columns.at(-1) ?? null,
    pending: false,
    result: over ? { k: "rules", winner: over.winner, result: over } : null,
    lang: "en",
    t: (key, vars) => translate("en", key, vars),
    play: vi.fn(),
    ...extra,
  };
}

const columns = (host) => [...host.querySelectorAll("button.ffr-col")];
const slot = (host, cell) => host.querySelector(`[data-cell="${cell}"]`);

describe("the board", () => {
  it("has seven columns of six cells, each column named with its discs from the bottom", () => {
    const host = document.createElement("div");
    board.mount(host, context([3, 3, 0]));
    expect(columns(host)).toHaveLength(7);
    expect(host.querySelectorAll("[data-cell]")).toHaveLength(42);
    expect(host.querySelector('[role="group"]').getAttribute("aria-label")).toBe("Board");
    expect(columns(host)[0].getAttribute("aria-label")).toBe("Column 1: X");
    expect(columns(host)[1].getAttribute("aria-label")).toBe("Column 2: empty");
    expect(columns(host)[3].getAttribute("aria-label")).toBe("Column 4: X, O");
    expect(slot(host, 38).querySelector("svg.ffr-s0")).not.toBeNull();
    expect(slot(host, 31).querySelector("svg.ffr-s1")).not.toBeNull();
    expect(slot(host, 24).querySelector("svg")).toBeNull();
    // The last disc is the one in the last column played, at its top.
    expect(host.querySelectorAll(".last")).toHaveLength(1);
    expect(slot(host, 35).classList.contains("last")).toBe(true);
  });

  it("names the columns in the user's language", () => {
    const host = document.createElement("div");
    board.mount(host, context([3], { lang: "es", t: (key, vars) => translate("es", key, vars) }));
    expect(columns(host)[3].getAttribute("aria-label")).toBe("Columna 4: X");
    expect(columns(host)[0].getAttribute("aria-label")).toBe("Columna 1: vacía");
  });

  it("drops into a column when it is the user's turn, and not into a full one", () => {
    const host = document.createElement("div");
    const ctx = context([0, 0, 0, 0, 0, 0]);
    board.mount(host, ctx);
    expect(columns(host)[0].disabled).toBe(true);
    columns(host)[0].click();
    expect(ctx.play).not.toHaveBeenCalled();
    // Anywhere in the column: here, its top cell.
    slot(host, 4).click();
    expect(ctx.play).toHaveBeenCalledWith(4);
  });

  it("takes no touch while it is not the user's turn, and draws what it is told", () => {
    const host = document.createElement("div");
    const waiting = context([3], { canPlay: false });
    const shown = board.mount(host, waiting);
    expect(columns(host).every((column) => column.disabled)).toBe(true);
    columns(host)[2].click();
    expect(waiting.play).not.toHaveBeenCalled();
    shown.update(context([3, 2]));
    expect(slot(host, 37).querySelector("svg.ffr-s1")).not.toBeNull();
    expect(columns(host).some((column) => column.disabled)).toBe(false);
  });

  it("drops in only a disc that has just arrived", () => {
    const host = document.createElement("div");
    // Opening a match draws it still.
    const shown = board.mount(host, context([3, 3]));
    expect(host.querySelector(".drop")).toBeNull();
    shown.update(context([3, 3, 4]));
    expect(host.querySelectorAll(".drop")).toHaveLength(1);
    expect(slot(host, 39).classList.contains("drop")).toBe(true);
    // From the top of the board to the bottom row: six cells and the row above.
    expect(slot(host, 39).style.getPropertyValue("--f")).toBe("6");
    // Told of something else (the move reached the other phone), the disc goes on falling: the
    // same one, neither started again nor cut short.
    const disc = slot(host, 39).querySelector("svg");
    shown.update(context([3, 3, 4], { canPlay: false }));
    expect(slot(host, 39).querySelector("svg")).toBe(disc);
    expect(slot(host, 39).classList.contains("drop")).toBe(true);
    // The next disc is the one that drops.
    shown.update(context([3, 3, 4, 4]));
    expect([...host.querySelectorAll(".drop")].map((one) => Number(one.dataset.cell))).toEqual([32]);
  });

  it("marks a move that has not reached the other phone, and the winning four", () => {
    const host = document.createElement("div");
    const shown = board.mount(host, context([0, 0, 1, 1, 2, 2], { pending: true, canPlay: false }));
    expect(slot(host, 30).querySelector(".ffr-clock")).not.toBeNull();
    expect(slot(host, 30).classList.contains("pending")).toBe(true);
    shown.update(context([0, 0, 1, 1, 2, 2, 3], { canPlay: false }));
    expect(host.querySelector(".ffr-clock")).toBeNull();
    expect([...host.querySelectorAll(".win")].map((one) => Number(one.dataset.cell))).toEqual([35, 36, 37, 38]);
    expect(host.querySelector(".ffr").classList.contains("won")).toBe(true);
    expect(columns(host).every((column) => column.disabled)).toBe(true);
  });

  it("lends its discs, each with its mark, to the players' chips", () => {
    expect(DISCS[0]).toContain("ffr-s0");
    expect(DISCS[1]).toContain("ffr-s1");
    // Not by colour alone: a cross on one, a ring on the other.
    expect(DISCS[0]).toContain("<path");
    expect(DISCS[1].match(/<circle/g)).toHaveLength(2);
  });
});

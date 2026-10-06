// The board of dots and boxes: forty lines as buttons a finger wide, named for a screen reader in
// the user's language, drawn in the colour of whoever drew them, the boxes filled for their owner,
// only the free lines open on the user's turn, the last line marked, a pending one too.
import { describe, expect, it, vi } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { board, MARKS } from "../src/board.js";
import { TEXTS } from "../src/texts.js";
import { initial, play, result, turn } from "../src/rules.js";

const translate = translator(joinTexts(KIT_TEXTS, TEXTS));

function context(lines, extra = {}) {
  let state = initial();
  for (const line of lines) state = play(state, line, turn(state)).state;
  const over = result(state);
  return {
    state,
    mySide: turn(state),
    canPlay: !over,
    last: lines.at(-1) ?? null,
    pending: false,
    result: over ? { k: "rules", winner: over.winner, result: over } : null,
    lang: "en",
    t: (key, vars) => translate("en", key, vars),
    play: vi.fn(),
    view: { round: { moves: lines } },
    ...extra,
  };
}

const line = (host, index) => host.querySelector(`[data-line="${index}"]`);
const box = (host, index) => host.querySelector(`[data-box="${index}"]`);

describe("the board", () => {
  it("has forty lines and sixteen boxes, named and counted for a screen reader", () => {
    const host = document.createElement("div");
    board.mount(host, context([]));
    expect(host.querySelectorAll("button.fdb-line")).toHaveLength(40);
    expect(host.querySelectorAll(".fdb-box")).toHaveLength(16);
    expect(host.querySelectorAll(".fdb-dot")).toHaveLength(25);
    expect(host.querySelector('[role="group"]').getAttribute("aria-label")).toBe("Board: 0 boxes to 0");
    expect(line(host, 0).getAttribute("aria-label")).toBe("Line across, row 1, box 1: free");
    expect(line(host, 21).getAttribute("aria-label")).toBe("Line down, box 1, column 2: free");
    expect(MARKS).toHaveLength(2);
  });

  it("plays a free line on a tap, and not a drawn one or out of turn", () => {
    const host = document.createElement("div");
    const ctx = context([0]);
    board.mount(host, ctx);
    expect(line(host, 0).disabled).toBe(true);
    expect(line(host, 4).disabled).toBe(false);
    line(host, 4).click();
    expect(ctx.play).toHaveBeenCalledWith(4);
    line(host, 0).click();
    expect(ctx.play).toHaveBeenCalledTimes(1);
    const closed = document.createElement("div");
    board.mount(closed, context([0], { canPlay: false }));
    expect(closed.querySelectorAll(".fdb-line:enabled")).toHaveLength(0);
  });

  it("colours each line for who drew it, fills a closed box for its owner, and marks the last line", () => {
    const host = document.createElement("div");
    board.mount(host, context([0, 4, 20, 21]));
    expect(line(host, 0).classList.contains("d0")).toBe(true);
    expect(line(host, 4).classList.contains("d1")).toBe(true);
    expect(line(host, 0).getAttribute("aria-label")).toBe("Line across, row 1, box 1: X");
    expect(line(host, 4).getAttribute("aria-label")).toBe("Line across, row 2, box 1: O");
    expect(box(host, 0).classList.contains("b1")).toBe(true);
    expect(box(host, 0).querySelector("svg.fdb-o")).not.toBeNull();
    expect(box(host, 1).className).toBe("fdb-box");
    expect(host.querySelector('[role="group"]').getAttribute("aria-label")).toBe("Board: 0 boxes to 1");
    expect(line(host, 21).classList.contains("last")).toBe(true);
  });

  it("marks a line that has not reached the other phone, and speaks the user's language", () => {
    const host = document.createElement("div");
    const mounted = board.mount(host, context([]));
    mounted.update(context([0], { pending: true, lang: "es", t: (key, vars) => translate("es", key, vars) }));
    expect(line(host, 0).querySelector(".fdb-clock")).not.toBeNull();
    expect(line(host, 0).classList.contains("pending")).toBe(true);
    expect(line(host, 1).getAttribute("aria-label")).toBe("Línea horizontal, fila 1, casilla 2: libre");
    mounted.update(context([0]));
    expect(line(host, 0).querySelector(".fdb-clock")).toBeNull();
  });
});

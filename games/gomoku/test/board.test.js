// The board of Five in a Row: 225 intersections, each a button named for a screen reader, the
// stones in SVG, a stone placed in two taps (the first shows a ghost on a finger-sized target, the
// second places it), the last stone ringed, a pending one marked, the winning line lit.
import { describe, expect, it, vi } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { board, STONES } from "../src/board.js";
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
const ghost = (host) => host.querySelector(".fgm-ghost");

describe("the board", () => {
  it("has 225 intersections, named with their stone, and star points", () => {
    const host = document.createElement("div");
    board.mount(host, context([112, 113]));
    expect(host.querySelectorAll("button.fgm-cell")).toHaveLength(225);
    expect(host.querySelector('[role="group"]').getAttribute("aria-label")).toBe("Board");
    expect(cell(host, 112).getAttribute("aria-label")).toBe("Row 8, column 8: black");
    expect(cell(host, 113).getAttribute("aria-label")).toBe("Row 8, column 9: white");
    expect(cell(host, 0).getAttribute("aria-label")).toBe("Row 1, column 1: empty");
    expect(cell(host, 112).querySelector("svg.fgm-s0")).not.toBeNull();
    expect(cell(host, 113).querySelector("svg.fgm-s1")).not.toBeNull();
    expect(host.querySelectorAll(".fgm-cell.star")).toHaveLength(4, "the middle star is under a stone");
    expect(cell(host, 0).classList.contains("top")).toBe(true);
    expect(cell(host, 0).classList.contains("left")).toBe(true);
    expect(cell(host, 224).classList.contains("bottom")).toBe(true);
    expect(STONES).toHaveLength(2);
  });

  it("places a stone in two taps: the first shows a ghost, the second on the ghost places it", () => {
    const host = document.createElement("div");
    const ctx = context([]);
    board.mount(host, ctx);
    expect(ghost(host)).toBeNull();
    cell(host, 112).click();
    expect(ctx.play).not.toHaveBeenCalled();
    expect(ghost(host)).not.toBeNull();
    expect(ghost(host).getAttribute("aria-label")).toBe("Place the stone at row 8, column 8");
    expect(ghost(host).querySelector("svg.fgm-s0")).not.toBeNull();
    ghost(host).click();
    expect(ctx.play).toHaveBeenCalledWith(112);
  });

  it("moves the ghost to another intersection, and places it with a second tap on the same one", () => {
    const host = document.createElement("div");
    const ctx = context([]);
    board.mount(host, ctx);
    cell(host, 112).click();
    cell(host, 97).click();
    expect(ghost(host).dataset.ghost).toBe("97");
    expect(ctx.play).not.toHaveBeenCalled();
    cell(host, 97).click();
    expect(ctx.play).toHaveBeenCalledWith(97);
  });

  it("opens nothing when it is not the user's turn, and names the cells in their language", () => {
    const host = document.createElement("div");
    const ctx = context([], { canPlay: false, lang: "es", t: (key, vars) => translate("es", key, vars) });
    board.mount(host, ctx);
    expect(host.querySelectorAll(".fgm-cell:enabled")).toHaveLength(0);
    cell(host, 112).click();
    expect(ghost(host)).toBeNull();
    expect(ctx.play).not.toHaveBeenCalled();
    expect(cell(host, 112).getAttribute("aria-label")).toBe("Fila 8, columna 8: vacía");
  });

  it("drops the ghost when a move arrives, rings the last stone, marks a pending one and lights the line", () => {
    const host = document.createElement("div");
    const ctx = context([]);
    const mounted = board.mount(host, ctx);
    cell(host, 112).click();
    mounted.update(context([112], { pending: true }));
    expect(ghost(host)).toBeNull();
    expect(cell(host, 112).classList.contains("last")).toBe(true);
    expect(cell(host, 112).querySelector(".fgm-clock")).not.toBeNull();
    mounted.update(context([112]));
    expect(cell(host, 112).querySelector(".fgm-clock")).toBeNull();
    const won = context([112, 113, 97, 114, 96, 130, 98, 145, 95, 160, 99]);
    mounted.update(won);
    expect(won.result.winner).toBe(0);
    expect([...host.querySelectorAll(".fgm-cell.won")].map((one) => Number(one.dataset.cell))).toEqual([95, 96, 97, 98, 99]);
    expect(host.querySelectorAll(".fgm-cell:enabled")).toHaveLength(0);
  });
});

describe("the players' chips", () => {
  // The chips sit outside the board (the kit draws them above it), so a stone's colour cannot hang
  // on a custom property set only inside the board: there the white stone came out black.
  it("draw the black stone black and the white stone white outside the board", async () => {
    const { STYLE } = await import("../src/board.js");
    const style = document.createElement("style");
    style.textContent = STYLE;
    document.head.append(style);
    const chips = document.createElement("div");
    chips.innerHTML = `<div class="ftg-player me"><span class="mark">${STONES[0]}</span></div><div class="ftg-player them"><span class="mark">${STONES[1]}</span></div>`;
    document.body.append(chips);
    const [black, white] = [...chips.querySelectorAll("svg")].map((stone) => getComputedStyle(stone));
    expect(black.getPropertyValue("--art-stone-0").trim()).toBe("#1d1d1d");
    expect(white.getPropertyValue("--art-stone-1").trim()).toBe("#f6f3ea");
    // The edge of the stone too, or a white stone vanishes on a light background.
    expect(white.getPropertyValue("--art-line").trim()).toBe("#6b4a24");
    chips.remove();
    style.remove();
  });
});

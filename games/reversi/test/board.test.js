import { afterEach, describe, expect, it, vi } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { TABLETOP_STYLE } from "../../../kit/src/tabletop/board.js";
import { board, DISCS, STYLE } from "../src/board.js";
import { TEXTS } from "../src/texts.js";
import { ART } from "../src/theme.js";
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

function mount(ctx) {
  const host = document.createElement("div");
  host.getBoundingClientRect = () => ({ left: 0, top: 0, width: 352, height: 352, right: 352, bottom: 352 });
  document.body.append(host);
  return { host, mounted: board.mount(host, ctx) };
}

afterEach(() => {
  document.body.innerHTML = "";
});

const cell = (host, index) => host.querySelector(`button[data-cell="${index}"]`);
const marked = (host, name) => [...host.querySelectorAll("button[data-mark]")].filter((one) => one.dataset.mark.split(" ").includes(name)).map((one) => Number(one.dataset.cell)).sort((a, b) => a - b);
const enabled = (host) => [...host.querySelectorAll("button[data-cell]")].filter((one) => !one.disabled).map((one) => Number(one.dataset.cell)).sort((a, b) => a - b);

describe("the board", () => {
  it("is drawn on a canvas, with the sixty-four cells as named buttons over it, the discs counted for a screen reader", () => {
    const { host } = mount(context([]));
    expect(host.querySelector("canvas").getAttribute("aria-hidden")).toBe("true");
    expect(host.querySelectorAll("button[data-cell]")).toHaveLength(64);
    expect(host.querySelector('[role="group"]').getAttribute("aria-label")).toBe("Board: 2 dark, 2 light");
    expect(cell(host, 27).getAttribute("aria-label")).toBe("Row 4, column 4: light");
    expect(cell(host, 28).getAttribute("aria-label")).toBe("Row 4, column 5: dark");
    expect(cell(host, 0).getAttribute("aria-label")).toBe("Row 1, column 1: empty");
    expect(host.querySelector("button[data-cell]").dataset.cell).toBe("0");
    expect(DISCS).toHaveLength(2);
  });

  it("opens only the cells the user may play, and plays one on a tap", () => {
    const ctx = context([]);
    const { host } = mount(ctx);
    expect(enabled(host)).toEqual([19, 26, 37, 44]);
    expect(marked(host, "can")).toEqual([19, 26, 37, 44]);
    cell(host, 19).click();
    expect(ctx.play).toHaveBeenCalledWith(19);
    cell(host, 0).click();
    expect(ctx.play).toHaveBeenCalledTimes(1);
  });

  it("opens nothing when it is not the user's turn, carries nothing to drag, and names the cells in their language", () => {
    const { host } = mount(context([], { canPlay: false, lang: "es", t: (key, vars) => translate("es", key, vars) }));
    expect(enabled(host)).toEqual([]);
    expect(marked(host, "can")).toEqual([]);
    expect(host.querySelectorAll("[data-drag]")).toHaveLength(0);
    expect(cell(host, 27).getAttribute("aria-label")).toBe("Fila 4, columna 4: clara");
  });

  it("marks the last disc, a pending one, and the discs a move turned", () => {
    const { host, mounted } = mount(context([]));
    mounted.update(context([19], { pending: true }));
    expect(marked(host, "last")).toEqual([19]);
    expect(marked(host, "pending")).toEqual([19]);
    expect(marked(host, "turned")).toEqual([27]);
    mounted.update(context([19]));
    expect(marked(host, "pending")).toEqual([]);
    expect(marked(host, "turned")).toEqual([27]);
    mounted.update(context([19, 18]));
    expect(marked(host, "last")).toEqual([18]);
    expect(marked(host, "turned")).toEqual([27]);
    expect(cell(host, 27).getAttribute("aria-label")).toBe("Row 4, column 4: light");
  });

  it("carries the kit's look for a canvas board, and outlines the player whose turn it is in the colour of that side's discs", () => {
    expect(STYLE).toContain(TABLETOP_STYLE);
    expect(STYLE).toContain(`.ftg{--hue-side-0:${ART.pieces[0].body};--hue-side-1:${ART.pieces[1].body}}`);
  });
});

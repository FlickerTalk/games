import { afterEach, describe, expect, it, vi } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { TABLETOP_STYLE } from "../../../kit/src/tabletop/board.js";
import { board, STONES, STYLE } from "../src/board.js";
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
const ghost = (host) => host.querySelector("button[data-ghost]");
const marked = (host, name) => [...host.querySelectorAll("button[data-mark]")].filter((one) => one.dataset.mark.split(" ").includes(name)).map((one) => Number(one.dataset.cell));
const enabled = (host) => [...host.querySelectorAll("button[data-cell]")].filter((one) => !one.disabled).length;

describe("the board", () => {
  it("is drawn on a canvas, with its 225 crossings as named buttons over it, named with their stone", () => {
    const { host } = mount(context([112, 113]));
    expect(host.querySelector("canvas").getAttribute("aria-hidden")).toBe("true");
    expect(host.querySelectorAll("button[data-cell]")).toHaveLength(225);
    expect(host.querySelector('[role="group"]').getAttribute("aria-label")).toBe("Board");
    expect(cell(host, 112).getAttribute("aria-label")).toBe("Row 8, column 8: black");
    expect(cell(host, 113).getAttribute("aria-label")).toBe("Row 8, column 9: white");
    expect(cell(host, 0).getAttribute("aria-label")).toBe("Row 1, column 1: empty");
    expect(host.querySelector("button[data-cell]").dataset.cell).toBe("0");
    expect(STONES).toHaveLength(2);
  });

  it("places a stone in two taps: the first chooses the crossing and shows a button to confirm it, the second on that button places it", () => {
    const ctx = context([]);
    const { host } = mount(ctx);
    expect(ghost(host)).toBeNull();
    cell(host, 112).click();
    expect(ctx.play).not.toHaveBeenCalled();
    expect(marked(host, "chosen")).toEqual([112]);
    expect(ghost(host).getAttribute("aria-label")).toBe("Place the stone at row 8, column 8");
    expect(ghost(host).dataset.ghost).toBe("112");
    ghost(host).click();
    expect(ctx.play).toHaveBeenCalledWith(112);
  });

  it("moves the choice to another crossing, and places it with a second tap on the same one", () => {
    const ctx = context([]);
    const { host } = mount(ctx);
    cell(host, 112).click();
    cell(host, 97).click();
    expect(ghost(host).dataset.ghost).toBe("97");
    expect(ctx.play).not.toHaveBeenCalled();
    cell(host, 97).click();
    expect(ctx.play).toHaveBeenCalledWith(97);
  });

  it("opens nothing when it is not the user's turn, and names the crossings in their language", () => {
    const ctx = context([], { canPlay: false, lang: "es", t: (key, vars) => translate("es", key, vars) });
    const { host } = mount(ctx);
    expect(enabled(host)).toBe(0);
    cell(host, 112).click();
    expect(ghost(host)).toBeNull();
    expect(ctx.play).not.toHaveBeenCalled();
    expect(cell(host, 112).getAttribute("aria-label")).toBe("Fila 8, columna 8: vacía");
    expect(host.querySelector('[role="group"]').getAttribute("aria-label")).toBe("Tablero");
  });

  it("lets go of the choice when a move arrives, marks the last stone, a pending one and the winning five", () => {
    const { host, mounted } = mount(context([]));
    cell(host, 112).click();
    mounted.update(context([112], { pending: true }));
    expect(ghost(host)).toBeNull();
    expect(marked(host, "last")).toEqual([112]);
    expect(marked(host, "pending")).toEqual([112]);
    mounted.update(context([112]));
    expect(marked(host, "pending")).toEqual([]);
    const won = context([112, 113, 97, 114, 96, 130, 98, 145, 95, 160, 99]);
    mounted.update(won);
    expect(won.result.winner).toBe(0);
    expect(marked(host, "won")).toEqual([95, 96, 97, 98, 99]);
    expect(enabled(host)).toBe(0);
  });

  it("carries the kit's look for a canvas board, and outlines the player whose turn it is in the colour of that side's stones", () => {
    expect(STYLE).toContain(TABLETOP_STYLE);
    expect(STYLE).toContain(`.ftg{--hue-side-0:${ART.pieces[0].body};--hue-side-1:${ART.pieces[1].body}}`);
  });
});

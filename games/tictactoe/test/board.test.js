import { afterEach, describe, expect, it, vi } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { checkTexts } from "../../../kit/test/helpers.js";
import { TABLETOP_STYLE } from "../../../kit/src/tabletop/board.js";
import { board, PIECES, STYLE } from "../src/board.js";
import { TEXTS } from "../src/texts.js";
import { ART } from "../src/theme.js";
import { initial, play } from "../src/rules.js";

const translate = translator(joinTexts(KIT_TEXTS, TEXTS));

function context(cells, extra = {}) {
  let state = initial();
  for (const cell of cells) state = play(state, cell, state.cells.filter((one) => one !== null).length % 2).state;
  return { state, mySide: cells.length % 2, canPlay: true, last: cells.at(-1) ?? null, pending: false, result: null, lang: "en", t: (key, vars) => translate("en", key, vars), play: vi.fn(), ...extra };
}

function mount(ctx) {
  const host = document.createElement("div");
  host.getBoundingClientRect = () => ({ left: 0, top: 0, width: 352, height: 352, right: 352, bottom: 352 });
  document.body.append(host);
  const mounted = board.mount(host, ctx);
  return { host, mounted };
}

afterEach(() => {
  document.body.innerHTML = "";
});

const cells = (host) => [...host.querySelectorAll("button[data-cell]")];
const marked = (host, name) => cells(host).filter((one) => (one.dataset.mark ?? "").split(" ").includes(name)).map((one) => Number(one.dataset.cell));

describe("the board", () => {
  it("is drawn on a canvas, with the nine cells as buttons over it, named by row and column, empty or with their mark", () => {
    const { host } = mount(context([4, 0]));
    expect(host.querySelector("canvas").getAttribute("aria-hidden")).toBe("true");
    expect(cells(host)).toHaveLength(9);
    expect(host.querySelector('[role="group"]').getAttribute("aria-label")).toBe("Board");
    expect(cells(host)[0].getAttribute("aria-label")).toBe("Row 1, column 1: O");
    expect(cells(host)[4].getAttribute("aria-label")).toBe("Row 2, column 2: X");
    expect(cells(host)[8].getAttribute("aria-label")).toBe("Row 3, column 3: empty");
    expect(marked(host, "last")).toEqual([0]);
  });

  it("plays an empty cell when it is the user's turn, and nothing else", () => {
    const ctx = context([4]);
    const { host, mounted } = mount(ctx);
    cells(host)[4].click();
    expect(ctx.play).not.toHaveBeenCalled();
    cells(host)[2].click();
    expect(ctx.play).toHaveBeenCalledWith(2);
    const waiting = context([4], { canPlay: false });
    mounted.update(waiting);
    cells(host)[2].click();
    expect(waiting.play).not.toHaveBeenCalled();
    expect(cells(host).filter((one) => one.disabled)).toHaveLength(9);
    mounted.update(context([4, 2]));
    expect(cells(host)[2].getAttribute("aria-label")).toBe("Row 1, column 3: O");
  });

  it("marks a move that has not reached the other phone, and the winning line", () => {
    const { host, mounted } = mount(context([0, 3, 1], { pending: true, canPlay: false }));
    expect(marked(host, "pending")).toEqual([1]);
    mounted.update(context([0, 3, 1, 4, 2], { canPlay: false, result: { k: "rules", winner: 0, result: { winner: 0, line: [0, 1, 2] } } }));
    expect(marked(host, "pending")).toEqual([]);
    expect(marked(host, "win")).toEqual([0, 1, 2]);
  });

  it("lends small drawings of its pieces to the players' chips, and outlines the player whose turn it is in that side's colour", () => {
    expect(PIECES).toHaveLength(2);
    expect(PIECES[0]).toContain("<path");
    expect(PIECES[1]).toContain("<circle");
    expect(STYLE).toContain(TABLETOP_STYLE);
    expect(STYLE).toContain(`.ftg{--hue-side-0:${ART.pieces[0].hue};--hue-side-1:${ART.pieces[1].hue}}`);
  });
});

describe("the texts", () => {
  it("speak the 21 languages, the kit's and the game's together", () => {
    checkTexts(joinTexts(KIT_TEXTS, TEXTS));
    expect(translate("es", "name")).toBe("Tres en raya");
    expect(translate("ja", "cell", { row: 1, col: 2 })).toBe("1行2列");
  });
});

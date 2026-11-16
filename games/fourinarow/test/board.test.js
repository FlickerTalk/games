import { afterEach, describe, expect, it, vi } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { TABLETOP_STYLE } from "../../../kit/src/tabletop/board.js";
import { board, DISCS, STYLE } from "../src/board.js";
import { TEXTS } from "../src/texts.js";
import { ART } from "../src/theme.js";
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

function mount(ctx) {
  const host = document.createElement("div");
  host.getBoundingClientRect = () => ({ left: 0, top: 0, width: 352, height: 352, right: 352, bottom: 352 });
  document.body.append(host);
  return { host, mounted: board.mount(host, ctx) };
}

afterEach(() => {
  document.body.innerHTML = "";
});

const columns = (host) => [...host.querySelectorAll("button[data-col]")];
const column = (host, index) => host.querySelector(`button[data-col="${index}"]`);
const marked = (host, name) => columns(host).filter((one) => (one.dataset.mark ?? "").split(" ").includes(name)).map((one) => Number(one.dataset.col));

describe("the board", () => {
  it("is drawn on a canvas, with the seven columns as named buttons over it, each named with its discs from the bottom", () => {
    const { host } = mount(context([3, 3, 0]));
    expect(host.querySelector("canvas").getAttribute("aria-hidden")).toBe("true");
    expect(columns(host).map((one) => Number(one.dataset.col))).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(host.querySelector('[role="group"]').getAttribute("aria-label")).toBe("Board");
    expect(column(host, 0).getAttribute("aria-label")).toBe("Column 1: X");
    expect(column(host, 1).getAttribute("aria-label")).toBe("Column 2: empty");
    expect(column(host, 3).getAttribute("aria-label")).toBe("Column 4: X, O");
    expect(marked(host, "last")).toEqual([0]);
  });

  it("names the columns in the user's language", () => {
    const { host } = mount(context([3], { lang: "es", t: (key, vars) => translate("es", key, vars) }));
    expect(column(host, 3).getAttribute("aria-label")).toBe("Columna 4: X");
    expect(column(host, 0).getAttribute("aria-label")).toBe("Columna 1: vacía");
  });

  it("drops into a column when it is the user's turn, and not into a full one", () => {
    const ctx = context([0, 0, 0, 0, 0, 0]);
    const { host } = mount(ctx);
    expect(column(host, 0).disabled).toBe(true);
    column(host, 0).click();
    expect(ctx.play).not.toHaveBeenCalled();
    column(host, 4).click();
    expect(ctx.play).toHaveBeenCalledWith(4);
  });

  it("takes no touch while it is not the user's turn, and follows what it is told", () => {
    const waiting = context([3], { canPlay: false });
    const { host, mounted } = mount(waiting);
    expect(columns(host).every((one) => one.disabled)).toBe(true);
    column(host, 2).click();
    expect(waiting.play).not.toHaveBeenCalled();
    mounted.update(context([3, 2]));
    expect(column(host, 2).getAttribute("aria-label")).toBe("Column 3: O");
    expect(columns(host).some((one) => one.disabled)).toBe(false);
    expect(marked(host, "can")).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("marks a move that has not reached the other phone, and the column of the winning four", () => {
    const { host, mounted } = mount(context([0, 0, 1, 1, 2, 2], { pending: true, canPlay: false }));
    expect(marked(host, "pending")).toEqual([2]);
    mounted.update(context([0, 0, 1, 1, 2, 2, 3], { canPlay: false }));
    expect(marked(host, "pending")).toEqual([]);
    expect(marked(host, "win")).toEqual([0, 1, 2, 3]);
    expect(columns(host).every((one) => one.disabled)).toBe(true);
  });

  it("lends its discs, each with its mark, to the players' chips", () => {
    expect(DISCS).toHaveLength(2);
    expect(DISCS[0]).toMatch(/stroke-linecap="round"/);
    expect(DISCS[1].match(/<circle/g)).toHaveLength(2);
  });

  it("carries the kit's look for a canvas board, and outlines the player whose turn it is in the colour of that side's discs", () => {
    expect(STYLE).toContain(TABLETOP_STYLE);
    expect(STYLE).toContain(`.ftg{--hue-side-0:${ART.pieces[0].body};--hue-side-1:${ART.pieces[1].body}}`);
  });

  it("lets go of its canvas and buttons when it leaves", () => {
    const { host, mounted } = mount(context([3]));
    mounted.destroy();
    expect(host.children).toHaveLength(0);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { TABLETOP_STYLE } from "../../../kit/src/tabletop/board.js";
import { board, MARKS, STYLE } from "../src/board.js";
import { TEXTS } from "../src/texts.js";
import { ART } from "../src/theme.js";
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

function mount(ctx) {
  const host = document.createElement("div");
  host.getBoundingClientRect = () => ({ left: 0, top: 0, width: 352, height: 352, right: 352, bottom: 352 });
  document.body.append(host);
  return { host, mounted: board.mount(host, ctx) };
}

afterEach(() => {
  document.body.innerHTML = "";
});

const line = (host, index) => host.querySelector(`button[data-line="${index}"]`);
const marks = (host, index) => (line(host, index).dataset.mark ?? "").split(" ");

describe("the board", () => {
  it("is drawn on a canvas, with each line a named button over it, the boxes counted for a screen reader", () => {
    const { host } = mount(context([]));
    expect(host.querySelector("canvas").getAttribute("aria-hidden")).toBe("true");
    expect(host.querySelectorAll("button[data-line]")).toHaveLength(40);
    expect(host.querySelector('[role="group"]').getAttribute("aria-label")).toBe("Board: 0 boxes to 0");
    expect(line(host, 0).getAttribute("aria-label")).toBe("Line across, row 1, box 1: free");
    expect(line(host, 21).getAttribute("aria-label")).toBe("Line down, box 1, column 2: free");
    expect(MARKS).toHaveLength(2);
  });

  it("plays a free line on a tap, and not a drawn one or out of turn", () => {
    const ctx = context([0]);
    const { host } = mount(ctx);
    expect(line(host, 0).disabled).toBe(true);
    expect(line(host, 4).disabled).toBe(false);
    line(host, 4).click();
    expect(ctx.play).toHaveBeenCalledWith(4);
    line(host, 0).click();
    expect(ctx.play).toHaveBeenCalledTimes(1);
    document.body.innerHTML = "";
    const { host: closed } = mount(context([0], { canPlay: false }));
    expect([...closed.querySelectorAll("button[data-line]")].filter((one) => !one.disabled)).toHaveLength(0);
  });

  it("names who drew each line, marks the last one, and counts a closed box for its owner", () => {
    const { host } = mount(context([0, 4, 20, 21]));
    expect(marks(host, 0)).toContain("d0");
    expect(marks(host, 4)).toContain("d1");
    expect(line(host, 0).getAttribute("aria-label")).toBe("Line across, row 1, box 1: X");
    expect(line(host, 4).getAttribute("aria-label")).toBe("Line across, row 2, box 1: O");
    expect(host.querySelector('[role="group"]').getAttribute("aria-label")).toBe("Board: 0 boxes to 1");
    expect(marks(host, 21)).toContain("last");
    expect(line(host, 1).dataset.mark).toBeUndefined();
  });

  it("marks a line that has not reached the other phone, and speaks the user's language", () => {
    const { host, mounted } = mount(context([]));
    mounted.update(context([0], { pending: true, lang: "es", t: (key, vars) => translate("es", key, vars) }));
    expect(marks(host, 0)).toContain("pending");
    expect(line(host, 1).getAttribute("aria-label")).toBe("Línea horizontal, fila 1, casilla 2: libre");
    mounted.update(context([0]));
    expect(marks(host, 0)).not.toContain("pending");
  });

  it("turns each line's touch area on its corner, and carries the kit's look for a canvas board", () => {
    expect(STYLE).toContain(TABLETOP_STYLE);
    expect(STYLE).toMatch(/button\[data-line\]\{[^}]*transform:rotate\(45deg\)/);
    expect(STYLE).toMatch(/button\[data-line\]:not\(:disabled\):active::after/);
  });

  it("outlines the player whose turn it is in the colour of that side's mark", () => {
    expect(STYLE).toContain(`.ftg{--hue-side-0:${ART.pieces[0].body};--hue-side-1:${ART.pieces[1].body}}`);
  });
});

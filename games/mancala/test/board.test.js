import { afterEach, describe, expect, it, vi } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { TABLETOP_STYLE } from "../../../kit/src/tabletop/board.js";
import { MARKERS, STYLE, board } from "../src/board.js";
import { TEXTS } from "../src/texts.js";
import { ART } from "../src/theme.js";
import { initial, play, result, turn } from "../src/rules.js";

const translate = translator(joinTexts(KIT_TEXTS, TEXTS));

function context(moves, extra = {}) {
  let state = initial();
  for (const move of moves) state = play(state, move, turn(state)).state;
  const over = result(state);
  return {
    state,
    mySide: turn(state),
    canPlay: !over,
    last: moves.at(-1) ?? null,
    pending: false,
    result: over ? { k: "rules", winner: over.winner, result: over } : null,
    lang: "en",
    t: (key, vars) => translate("en", key, vars),
    play: vi.fn(),
    view: { round: { moves } },
    ...extra,
  };
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

const pit = (host, index) => host.querySelector(`button[data-pit="${index}"]`);
const store = (host, side) => host.querySelector(`button[data-store="${side}"]`);
const enabled = (host) => [...host.querySelectorAll("button[data-key]")].filter((one) => !one.disabled).map((one) => Number(one.dataset.key));
const marked = (host, name) => [...host.querySelectorAll("button[data-mark]")].filter((one) => one.dataset.mark.split(" ").includes(name)).map((one) => Number(one.dataset.key));

describe("the board", () => {
  it("is drawn on a canvas, with each pit and store as a named button over it, the stores counted for a screen reader", () => {
    const { host } = mount(context([]));
    expect(host.querySelector("canvas").getAttribute("aria-hidden")).toBe("true");
    expect(host.querySelectorAll("button[data-pit]")).toHaveLength(12);
    expect(host.querySelectorAll("button[data-move]")).toHaveLength(6);
    expect(host.querySelector('[role="group"]').getAttribute("aria-label")).toBe("Board: 0 seeds to 0");
    expect(pit(host, 0).getAttribute("aria-label")).toBe("Your pit 1: 4 seeds");
    expect(pit(host, 7).getAttribute("aria-label")).toBe("Their pit 1: 4 seeds");
    expect(store(host, 0).getAttribute("aria-label")).toBe("Your store: 0 seeds");
    expect(store(host, 1).getAttribute("aria-label")).toBe("Their store: 0 seeds");
    expect(host.querySelector('button[data-move="0"]')).toBe(pit(host, 0));
    expect(MARKERS).toHaveLength(2);
  });

  it("opens only one's own pits with seeds, on one's turn, and sows one on a tap", () => {
    const ctx = context([0]);
    const { host } = mount(ctx);
    expect(enabled(host)).toEqual([7, 8, 9, 10, 11, 12]);
    pit(host, 7).click();
    expect(ctx.play).toHaveBeenCalledWith(0);
    document.body.innerHTML = "";
    const again = mount(context([2]));
    expect(pit(again.host, 2).disabled).toBe(true);
    expect(pit(again.host, 1).disabled).toBe(false);
    document.body.innerHTML = "";
    const waiting = mount(context([0], { mySide: 0, canPlay: false }));
    expect(enabled(waiting.host)).toEqual([]);
  });

  it("turns the board for side 1 and speaks the user's language", () => {
    const { host } = mount(context([], { mySide: 1, canPlay: false, lang: "es", t: (key, vars) => translate("es", key, vars) }));
    expect(pit(host, 7).getAttribute("aria-label")).toBe("Tu hoyo 1: 4 semillas");
    expect(pit(host, 7).dataset.move).toBe("0");
    expect(pit(host, 0).getAttribute("aria-label")).toBe("Su hoyo 1: 4 semillas");
    expect(pit(host, 0).dataset.move).toBeUndefined();
    expect(store(host, 1).getAttribute("aria-label")).toBe("Tu almacén: 0 semillas");
    expect(host.querySelector("button[data-key]").dataset.key).toBe("6");
  });

  it("marks the pit last emptied, whoever emptied it, and a move still on its way", () => {
    const { host, mounted } = mount(context([]));
    mounted.update(context([2], { mySide: 0, pending: true }));
    expect(marked(host, "last")).toEqual([2]);
    expect(marked(host, "pending")).toEqual([2]);
    mounted.update(context([2, 0], { mySide: 0 }));
    expect(marked(host, "last")).toEqual([0]);
    mounted.update(context([2, 0, 3], { mySide: 0 }));
    expect(marked(host, "last")).toEqual([10]);
    expect(marked(host, "pending")).toEqual([]);
  });

  it("carries nothing to drag, the kit's look for a canvas board, and the sides' colours for the turn outline", () => {
    const { host } = mount(context([]));
    expect(host.querySelectorAll("[data-drag]")).toHaveLength(0);
    expect(STYLE).toContain(TABLETOP_STYLE);
    expect(STYLE).toContain(`.ftg{--hue-side-0:${ART.pieces[0].body};--hue-side-1:${ART.pieces[1].body}}`);
  });
});

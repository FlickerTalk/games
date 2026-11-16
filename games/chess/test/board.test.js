import { afterEach, describe, expect, it, vi } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { DRAG_STYLE } from "../../../kit/src/drag.js";
import { TABLETOP_STYLE } from "../../../kit/src/tabletop/board.js";
import { SIDES, STYLE, board } from "../src/board.js";
import { initial, play, turn } from "../src/rules.js";
import { TEXTS } from "../src/texts.js";
import { ART } from "../src/theme.js";

const translate = translator(joinTexts(KIT_TEXTS, TEXTS));
const TO_PROMOTE = "a2a4 b7b5 a4b5 a7a6 b5a6 c8b7 a6b7 b8c6".split(" ");

function after(moves) {
  let state = initial();
  for (const move of moves) state = play(state, move, turn(state)).state;
  return state;
}

function context(moves = [], extra = {}) {
  const state = after(moves);
  const lang = extra.lang ?? "en";
  const mySide = extra.mySide ?? 0;
  return {
    state,
    mySide,
    canPlay: turn(state) === mySide && !state.end,
    last: moves.at(-1) ?? null,
    pending: false,
    result: state.end ? { k: "rules", winner: state.end.winner, result: state.end } : null,
    lang,
    t: (key, vars) => translate(lang, key, vars),
    play: vi.fn(),
    view: {},
    ...extra,
  };
}

function mount(ctx) {
  const host = document.createElement("div");
  host.setAttribute("dir", "ltr");
  host.getBoundingClientRect = () => ({ left: 0, top: 0, width: 320, height: 320, right: 320, bottom: 320 });
  document.body.append(host);
  return { host, shown: board.mount(host, ctx) };
}

const pointer = (node, type, x, y) => node.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, isPrimary: true, button: 0, pointerType: "touch" }));
const square = (host, name) => host.querySelector(`button[data-square="${name}"]`);
const marked = (host, name) => [...host.querySelectorAll("button[data-mark]")].filter((one) => one.dataset.mark.split(" ").includes(name)).map((one) => one.dataset.square).sort();
const layer = (host) => host.querySelector('[role="group"]');

function drag(host, from, to) {
  const piece = square(host, from);
  pointer(piece, "pointerdown", 10, 10);
  pointer(piece, "pointermove", 40, 40);
  const lit = [...host.querySelectorAll("[data-drop-ok]")].map((one) => one.dataset.square).sort();
  document.elementFromPoint = () => (to === null ? null : square(host, to));
  pointer(layer(host), "pointerup", 40, 40);
  return lit;
}

const realFromPoint = document.elementFromPoint;
afterEach(() => {
  document.elementFromPoint = realFromPoint;
  document.body.innerHTML = "";
});

describe("the chess board", () => {
  it("is drawn on a canvas, with a named button over each square, seen from the user's side", () => {
    const { host } = mount(context());
    expect(host.querySelector("canvas").getAttribute("aria-hidden")).toBe("true");
    expect(host.querySelectorAll("button[data-square]")).toHaveLength(64);
    expect(layer(host).getAttribute("aria-label")).toBe("Chessboard");
    expect(host.querySelector("button[data-square]").dataset.square).toBe("a8");
    expect(square(host, "e1").getAttribute("aria-label")).toBe("e1: King (white)");
    expect(square(host, "d8").getAttribute("aria-label")).toBe("d8: Queen (black)");
    expect(square(host, "e4").getAttribute("aria-label")).toBe("e4: empty");
    expect(square(host, "g8").dataset.piece).toBe("bn");
    const black = mount(context([], { mySide: 1 })).host;
    expect(black.querySelector("button[data-square]").dataset.square).toBe("h1");
  });

  it("moves by tapping a piece and then where it goes, showing where it may go", () => {
    const ctx = context();
    const { host } = mount(ctx);
    square(host, "e2").click();
    expect(marked(host, "from")).toEqual(["e2"]);
    expect(marked(host, "to")).toEqual(["e3", "e4"]);
    square(host, "e4").click();
    expect(ctx.play).toHaveBeenCalledWith("e2e4");
  });

  it("opens only the squares a move can use, and rings a piece it can take", () => {
    const ctx = context(["e2e4", "d7d5"]);
    const { host } = mount(ctx);
    square(host, "e4").click();
    expect(marked(host, "to")).toEqual(["d5", "e5"]);
    expect(marked(host, "take")).toEqual(["d5"]);
    expect(square(host, "e6").disabled).toBe(true);
    square(host, "d5").click();
    expect(ctx.play).toHaveBeenCalledWith("e4d5");
  });

  it("opens nothing when it is not the user's turn, nor after the end", () => {
    const waiting = context(["e2e4"], { mySide: 0 });
    const { host } = mount(waiting);
    expect([...host.querySelectorAll("button[data-square]")].every((one) => one.disabled)).toBe(true);
    const over = mount(context(["f2f3", "e7e5", "g2g4", "d8h4"], { mySide: 0, canPlay: true })).host;
    expect([...over.querySelectorAll("button[data-square]")].filter((one) => !one.disabled)).toEqual([]);
  });

  it("asks which piece to promote to, in the user's language, and plays the one chosen", () => {
    const ctx = context(TO_PROMOTE, { lang: "es" });
    const { host } = mount(ctx);
    square(host, "b7").click();
    square(host, "a8").click();
    expect(layer(host).getAttribute("aria-label")).toBe("Coronar el peón como");
    const choices = [...host.querySelectorAll("button[data-promote]")];
    expect(choices.map((one) => one.getAttribute("aria-label"))).toEqual(["Dama", "Torre", "Alfil", "Caballo"]);
    expect(host.querySelector('button[data-key="cancel"]').getAttribute("aria-label")).toBe("Cancelar");
    host.querySelector('button[data-promote="n"]').click();
    expect(ctx.play).toHaveBeenCalledWith("b7a8n");
  });

  it("marks the last move, a move still pending and the king in check", () => {
    const { host, shown } = mount(context(["e2e4", "f7f6", "d1h5"], { mySide: 1 }));
    expect(marked(host, "last")).toEqual(["d1", "h5"]);
    expect(marked(host, "check")).toEqual(["e8"]);
    expect(layer(host).getAttribute("aria-label")).toBe("Chessboard · Check");
    shown.update(context(["e2e4", "f7f6", "d1h5", "g7g6"], { mySide: 1, pending: true }));
    expect(marked(host, "last")).toEqual(["g6", "g7"]);
    expect(marked(host, "pending")).toEqual(["g6"]);
    expect(marked(host, "check")).toEqual([]);
  });

  it("plays a move by dragging the piece to a legal square, lighting where it may go", () => {
    const ctx = context();
    const { host } = mount(ctx);
    expect([...host.querySelectorAll("[data-drag]")].map((one) => one.dataset.square).sort()).toEqual(["a2", "b1", "b2", "c2", "d2", "e2", "f2", "g1", "g2", "h2"]);
    expect(drag(host, "g1", "f3")).toEqual(["f3", "h3"]);
    expect(ctx.play).toHaveBeenCalledWith("g1f3");
  });

  it("plays nothing when a piece is let go on a square it may not reach, or off the board", () => {
    const ctx = context();
    const { host } = mount(ctx);
    drag(host, "e2", "e5");
    drag(host, "e2", null);
    expect(ctx.play).not.toHaveBeenCalled();
  });

  it("lets go of everything when it leaves the screen", () => {
    const { host, shown } = mount(context(["e2e4"]));
    shown.destroy();
    expect(host.children).toHaveLength(0);
  });

  it("lends a king of each colour to the players' chips, outlines the turn in each side's tone, and carries the kit's look for a canvas board and a drag", () => {
    expect(SIDES).toHaveLength(2);
    expect(SIDES[0]).toContain(ART.pieces[0].fill);
    expect(SIDES[1]).toContain(ART.pieces[1].fill);
    expect(STYLE).toContain(TABLETOP_STYLE);
    expect(STYLE).toContain(DRAG_STYLE);
    expect(STYLE).toContain(`--hue-side-0:${ART.sides[0]};--hue-side-1:${ART.sides[1]}`);
    expect(STYLE.replace(/\s/g, "")).toContain(".ftc-rim{stroke:var(--muted)}");
  });
});

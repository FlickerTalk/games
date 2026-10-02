// The chess board: cm-chessboard drawing the Chessnut pieces from a sprite put in the document first
// (in the light DOM, as the kit mounts boards), turned to the user's colour, moved by tapping (or
// dragging: the frame spec covers what happy-dom cannot) with the legal moves shown, promotion asked
// in the user's language, the last move, the king in check and how the game ended on it. It hands
// the user's moves to the kit as UCI and takes them only when the user may play.
import { afterEach, describe, expect, it, vi } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { Chessboard } from "cm-chessboard/src/Chessboard.js";
import { SIDES, STYLE, board } from "../src/board.js";
import { initial, play, turn } from "../src/rules.js";
import { TEXTS } from "../src/texts.js";

const translate = translator(joinTexts(KIT_TEXTS, TEXTS));
const TO_PROMOTE = "a2a4 b7b5 a4b5 a7a6 b5a6 c8b7 a6b7 b8c6".split(" ");

function after(moves) {
  let state = initial();
  for (const move of moves) state = play(state, move, turn(state)).state;
  return state;
}

/** What the kit hands the board after `moves`, for the user playing `mySide`. */
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
  document.body.append(host);
  return { host, shown: board.mount(host, ctx) };
}

const square = (host, name) => host.querySelector(`rect.square[data-square="${name}"]`);
const marks = (host, kind) => [...host.querySelectorAll(`.markers g[data-square]`)].filter((g) => g.querySelector(`use.${kind}`)).map((g) => g.dataset.square).sort();
const files = (host) => [...host.querySelectorAll(".coordinates .file")].map((text) => text.textContent).join("");

/** A tap: the finger goes down on a square and comes up there. */
function tap(host, name) {
  const target = square(host, name);
  target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
  target.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, button: 0 }));
}

const later = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));

afterEach(() => {
  document.body.innerHTML = "";
});

describe("the chess board", () => {
  it("puts the pieces and the marks in the document first, then draws 32 pieces from them", () => {
    const { host } = mount(context());
    const sprite = document.getElementById("cm-chessboard-sprite");
    expect(sprite.parentElement).toBe(document.body);
    expect([...sprite.querySelectorAll("svg > g[id]")].map((g) => g.id).sort()).toEqual(["bb", "bk", "bn", "bp", "bq", "br", "wb", "wk", "wn", "wp", "wq", "wr"]);
    expect(document.getElementById("cm-chessboard-markers").querySelector("#ftcDot")).not.toBeNull();
    const pieces = host.querySelectorAll(".cm-chessboard .pieces > g[data-piece]");
    expect(pieces).toHaveLength(32);
    for (const piece of pieces) expect(piece.querySelector("use").getAttribute("href")).toMatch(/^#[wb][kqrbnp]$/);
    expect(host.querySelectorAll("rect.square")).toHaveLength(64);
    expect(host.querySelector(".ftc").getAttribute("aria-label")).toBe("Chessboard");
    expect(host.dataset.fen).toBe("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    // A second board does not add the sprites again.
    mount(context());
    expect(document.querySelectorAll("#cm-chessboard-sprite")).toHaveLength(1);
  });

  it("shows the board from the user's side, with its coordinates, and turns it for a new colour", async () => {
    expect(files(mount(context([], { mySide: 0 })).host)).toBe("abcdefgh");
    const { host, shown } = mount(context([], { mySide: 1 }));
    expect(files(host)).toBe("hgfedcba");
    shown.update(context([], { mySide: 0 }));
    await later();
    expect(files(host)).toBe("abcdefgh");
  });

  it("moves by tapping a piece and then where it goes, showing where it may go", () => {
    const ctx = context();
    const { host } = mount(ctx);
    tap(host, "e2");
    expect(marks(host, "ftc-move")).toEqual(["e3", "e4"]);
    expect(marks(host, "ftc-pick")).toEqual(["e2"]);
    tap(host, "e4");
    expect(ctx.play).toHaveBeenCalledWith("e2e4");
    expect(marks(host, "ftc-move")).toEqual([]);
  });

  it("refuses a move the rules refuse, and rings a piece it can take", () => {
    const ctx = context(["e2e4", "d7d5"]);
    const { host } = mount(ctx);
    tap(host, "e4");
    expect(marks(host, "ftc-move")).toEqual(["e5"]);
    expect(marks(host, "ftc-capture")).toEqual(["d5"]);
    tap(host, "e6");
    expect(ctx.play).not.toHaveBeenCalled();
    tap(host, "e4");
    tap(host, "d5");
    expect(ctx.play).toHaveBeenCalledWith("e4d5");
  });

  it("takes nothing when it is not the user's turn, nor after the end", () => {
    const waiting = context(["e2e4"], { mySide: 0 });
    const { host } = mount(waiting);
    expect(waiting.canPlay).toBe(false);
    tap(host, "d2");
    tap(host, "d4");
    expect(waiting.play).not.toHaveBeenCalled();
    expect(marks(host, "ftc-move")).toEqual([]);
    const over = context(["f2f3", "e7e5", "g2g4", "d8h4"], { mySide: 0, canPlay: true });
    const ended = mount(over).host;
    tap(ended, "a2");
    tap(ended, "a3");
    expect(over.play).not.toHaveBeenCalled();
  });

  it("asks which piece to promote to, in the user's language, and plays the one chosen", async () => {
    const ctx = context(TO_PROMOTE, { lang: "es" });
    const { host } = mount(ctx);
    tap(host, "b7");
    tap(host, "a8");
    // The dialog opens once the pawn has moved.
    await later(400);
    const buttons = [...host.querySelectorAll(".promotion-dialog-button-group")];
    expect(buttons.map((button) => button.getAttribute("aria-label"))).toEqual(["Dama", "Torre", "Alfil", "Caballo"]);
    expect(host.querySelector(".promotion-dialog-group").getAttribute("aria-label")).toBe("Coronar el peón como");
    const knight = host.querySelector('.promotion-dialog-button-group[data-piece="wn"] rect');
    knight.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 }));
    expect(ctx.play).toHaveBeenCalledWith("b7a8n");
  });

  it("marks the last move, a move still pending and the king in check, and leaves how the game ended to the kit", () => {
    const { host, shown } = mount(context(["e2e4", "f7f6", "d1h5"], { mySide: 1 }));
    expect(marks(host, "ftc-last")).toEqual(["d1", "h5"]);
    expect(marks(host, "ftc-check")).toEqual(["e8"]);
    expect(host.querySelector(".ftc").getAttribute("aria-label")).toBe("Chessboard · Check");
    shown.update(context(["e2e4", "f7f6", "d1h5", "g7g6"], { mySide: 1, pending: true }));
    expect(marks(host, "ftc-last")).toEqual([]);
    expect(marks(host, "ftc-pending")).toEqual(["g6", "g7"]);
    expect(marks(host, "ftc-check")).toEqual([]);
    shown.update(context(["f2f3", "e7e5", "g2g4", "d8h4"], { lang: "es" }));
    expect(marks(host, "ftc-check")).toEqual(["e1"]);
    // Nothing is drawn over the board: the kit says how it ended, under the status (game.how).
    expect(host.querySelector(".ftc-end")).toBeNull();
    expect(host.textContent).not.toContain("Jaque mate");
  });

  it("lets cm-chessboard go when it leaves the screen, once", () => {
    const destroy = vi.spyOn(Chessboard.prototype, "destroy");
    const { host, shown } = mount(context(["e2e4"]));
    expect(host.querySelector(".cm-chessboard")).not.toBeNull();
    shown.destroy();
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(host.querySelector(".cm-chessboard")).toBeNull();
    shown.destroy();
    expect(destroy).toHaveBeenCalledTimes(1);
    destroy.mockRestore();
  });

  it("follows the moves it is told of", async () => {
    const { host, shown } = mount(context());
    shown.update(context(["e2e4"]));
    expect(host.dataset.fen).toBe("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1");
    await later(400);
    expect(host.querySelector('.pieces > g[data-square="e4"]')?.dataset.piece).toBe("wp");
    expect(host.querySelector('.pieces > g[data-square="e2"]')).toBeNull();
  });

  it("lends a king of each colour to the players' chips, and keeps the sheet from taking a drag", () => {
    expect(SIDES[0]).toContain('href="#wk"');
    expect(SIDES[1]).toContain('href="#bk"');
    expect(STYLE.replace(/\s/g, "")).toContain("touch-action:none");
  });
});

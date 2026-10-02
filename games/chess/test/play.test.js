// Two phones playing chess against the fake core, by touch, as people would: the coin says who plays
// white, a whole game to checkmate and the result sent with its PGN, a promotion, a move from the
// other phone that breaks the rules, a move made without a connection that goes with the next hello,
// one side closing the game and coming back to it, and a long game that still fits in one message.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Chess } from "chess.js";
import { Chessboard } from "cm-chessboard/src/Chessboard.js";
import { KV, PROTOCOL, fromBase64, seal } from "../../../kit/src/envelope.js";
import { MATCH_LIMIT } from "../../../kit/src/table.js";
import { fakeCore, phones, settle } from "../../../kit/test/helpers.js";
import { initial, play, result, turn } from "../src/rules.js";
import "../src/index.js";

/** Lets messages land, the kit work, and the board finish moving its pieces. */
async function tick() {
  const tables = () => [...document.querySelectorAll("ft-chess")].map((element) => element.table);
  await settle(tables());
  await vi.advanceTimersByTimeAsync(400);
  await settle(tables());
}
const text = (element) => element.textContent.replace(/\s+/g, " ");
const fen = (element) => element.querySelector(".ftg-board").dataset.fen;
const files = (element) => [...element.querySelectorAll(".coordinates .file")].map((one) => one.textContent).join("");
const decode = (data) => JSON.parse(new TextDecoder().decode(fromBase64(data)));

async function phone(core, opening = {}) {
  const element = document.createElement("ft-chess");
  element.ft = core.ft;
  document.body.append(element);
  await core.open(opening);
  await tick();
  return element;
}

async function touch(element, selector) {
  const node = element.querySelector(selector);
  if (!node) throw new Error(`nothing to touch: ${selector}`);
  node.click();
  await tick();
}

/** A tap on a square of this phone's board. */
function tap(element, square) {
  const target = element.querySelector(`rect.square[data-square="${square}"]`);
  target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
  target.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, button: 0 }));
}

/** A move by touch: the piece, then where it goes. */
async function move(element, uci) {
  tap(element, uci.slice(0, 2));
  tap(element, uci.slice(2, 4));
  await tick();
}

/** Plays the moves in turn, starting with white. */
async function game(white, black, moves) {
  for (const [at, uci] of moves.entries()) await move(at % 2 ? black : white, uci);
}

/** Two phones in a match, the coin tossed: `white` starts. */
async function match() {
  const { a, b } = phones();
  const one = await phone(a);
  const two = await phone(b);
  await touch(one, '[data-kit="new"]');
  await tick();
  const [white, black] = one.table.view.myTurn ? [one, two] : [two, one];
  return { a, b, one, two, white, black };
}

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = "";
});
afterEach(() => vi.useRealTimers());

describe("chess between two phones", () => {
  it("gives white to the side the coin says starts, each board turned its way, and plays a game to checkmate", async () => {
    const { white, black } = await match();
    expect(white.table.view.mySide).toBe(0);
    expect(black.table.view.mySide).toBe(1);
    expect(text(white)).toContain("The coin says you start");
    expect(text(black)).toContain("The coin says they start");
    expect(files(white)).toBe("abcdefgh");
    expect(files(black)).toBe("hgfedcba");
    expect(white.querySelector('.ftg-player.me use').getAttribute("href")).toBe("#wk");
    expect(black.querySelector('.ftg-player.me use').getAttribute("href")).toBe("#bk");

    // Black cannot move a piece on white's turn.
    await move(black, "e7e5");
    expect(black.table.record.game.moves).toEqual([]);

    // Scholar's mate.
    await game(white, black, ["e2e4", "e7e5", "f1c4", "b8c6", "d1h5", "g8f6", "h5f7"]);
    for (const side of [white, black]) {
      expect(fen(side)).toBe("r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4");
      expect(side.querySelector(".ftg-hint-under").textContent).toBe("Checkmate");
      expect(side.querySelector(".ftc-end")).toBeNull();
    }
    expect(text(white)).toContain("You won");
    expect(text(black)).toContain("You lost");

    // Leaving the match lets its board go, once.
    const destroy = vi.spyOn(Chessboard.prototype, "destroy");
    await touch(black, '[data-kit="back"]');
    expect(destroy).toHaveBeenCalledTimes(1);
    destroy.mockRestore();
    await touch(white, '[data-kit="send"]');
    expect(white.ft.say).toHaveBeenCalledWith("♟️ Chess: I won (white) · Checkmate · moves: 4\n\n1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0");
  });

  it("plays the next round with the colours swapped", async () => {
    const { white, black } = await match();
    await game(white, black, ["f2f3", "e7e5", "g2g4", "d8h4"]);
    expect(text(black)).toContain("You won");
    await touch(black, '[data-kit="again"]');
    expect(black.table.view.mySide).toBe(0);
    expect(files(black)).toBe("abcdefgh");
    expect(files(white)).toBe("hgfedcba");
    await move(black, "d2d4");
    expect(fen(white)).toBe("rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1");
  });

  it("promotes a pawn to the piece picked on one phone, and the other sees it", async () => {
    const { white, black } = await match();
    await game(white, black, ["a2a4", "b7b5", "a4b5", "a7a6", "b5a6", "c8b7", "a6b7", "b8c6"]);
    tap(white, "b7");
    tap(white, "a8");
    await tick();
    const rook = white.querySelector('.promotion-dialog-button-group[data-piece="wr"] rect');
    expect(rook).not.toBeNull();
    rook.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 }));
    await tick();
    expect(black.table.record.game.moves.at(-1)).toBe("b7a8r");
    expect(fen(black).split("/")[0]).toBe("R2qkbnr");
    expect(black.querySelector('.pieces > g[data-square="a8"]').dataset.piece).toBe("wr");
  });

  it("refuses a move from the other phone that breaks the rules", async () => {
    const { a, b, white, black } = await match();
    const whiteCore = white.ft === a.ft ? a : b;
    await move(white, "e2e4");
    const forged = structuredClone(black.table.record.game);
    forged.moves.push("e7e4");
    const message = { p: PROTOCOL, kv: KV, g: "chess", gv: 1, k: "state", doc: white.table.record.id, who: black.table.record.me, app: "1.0.0", game: forged };
    await whiteCore.hear(seal(message));
    await tick();
    expect(text(white)).toContain("The other phone sent a move that breaks the rules. It was not applied.");
    expect(white.table.record.game.moves).toEqual(["e2e4"]);
    expect(fen(white)).toBe("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1");
  });

  it("keeps a move made without a connection pending, and sends it with the next hello", async () => {
    const { white, black } = await match();
    const send = white.ft.live.send;
    white.ft.live.send = vi.fn(async () => false);
    await move(white, "e2e4");
    expect(text(white)).toContain("The other phone cannot be reached right now.");
    expect(white.querySelectorAll(".markers use.ftc-pending")).toHaveLength(2);
    expect(black.table.record.game.moves).toEqual([]);
    white.ft.live.send = send;
    await touch(white, '[data-kit="back"]');
    await touch(white, '[data-kit="enter"]');
    expect(black.table.record.game.moves).toEqual(["e2e4"]);
    expect(white.querySelectorAll(".markers use.ftc-pending")).toHaveLength(0);
    expect(white.querySelectorAll(".markers use.ftc-last")).toHaveLength(2);
    await move(black, "c7c5");
    expect(white.table.record.game.moves).toEqual(["e2e4", "c7c5"]);
  });

  it("goes on from what each phone kept when the side that closed the game opens it again", async () => {
    const { a, b, white, black } = await match();
    await game(white, black, ["e2e4", "e7e5"]);
    const [whiteCore, blackCore] = white.ft === a.ft ? [a, b] : [b, a];
    // Black's person closes the game: the frame is gone, nothing goes in or out of it.
    blackCore.closed = true;
    blackCore.wire = () => {};
    black.table.stopTimers();
    black.remove();
    await move(white, "g1f3");
    await vi.advanceTimersByTimeAsync(8_100);
    expect(text(white)).toContain("The other person does not have “Chess” open in this conversation.");

    // They open it again, another day, with what their phone kept.
    const back = fakeCore({ records: blackCore.records });
    whiteCore.wire = (data) => setTimeout(() => back.hear(data), 0);
    back.wire = (data) => setTimeout(() => whiteCore.hear(data), 0);
    const again = await phone(back);
    expect(again.table.screen).toBe("list");
    await vi.advanceTimersByTimeAsync(15_000);
    await tick();
    expect(again.table.screen).toBe("match");
    expect(fen(again)).toBe("rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2");
    expect(files(again)).toBe("hgfedcba");
    await move(again, "b8c6");
    expect(white.table.record.game.moves).toEqual(["e2e4", "e7e5", "g1f3", "b8c6"]);
  });

  it("carries a game of 150 moves in one message, far below the kit's limit", async () => {
    // A long game that does not end: a move picked from the legal ones by a fixed sequence, never one that ends it.
    let seed = 7;
    const next = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    let state = initial();
    const moves = [];
    while (moves.length < 300) {
      const legal = new Chess(state.fen).moves({ verbose: true }).map((one) => one.lan);
      const pick = legal.map((_, at) => legal[(Math.floor(next() * legal.length) + at) % legal.length]).find((uci) => !result(play(state, uci, turn(state)).state));
      state = play(state, pick, turn(state)).state;
      moves.push(pick);
    }
    const { a, b, white, black } = await match();
    const whiteCore = white.ft === a.ft ? a : b;
    for (const [at, uci] of moves.entries()) {
      await (at % 2 ? black : white).table.play(uci);
      await settle([white.table, black.table]);
    }
    await tick();
    expect(black.table.record.game.moves).toHaveLength(300);
    expect(fen(black)).toBe(state.fen);
    const last = whiteCore.sent.map(decode).filter((message) => message.game).at(-1);
    const weight = new TextEncoder().encode(JSON.stringify(last)).length;
    expect(weight).toBeLessThan(MATCH_LIMIT / 10);
  }, 30_000);
});

describe("chess with nobody on the other side", () => {
  it("keeps the same timeline as every game: waiting at once, the notice at 8 s, a hello every 23 s, eight times", async () => {
    const { a, b } = phones();
    b.closed = true;
    const one = await phone(a);
    const start = Date.now();
    const hellos = [];
    const send = a.ft.live.send;
    a.ft.live.send = vi.fn(async (data) => {
      if (decode(data).k === "hello") hellos.push(Date.now() - start);
      return send(data);
    });
    one.querySelector('[data-kit="new"]').click();
    await settle([one.table]);
    expect(text(one)).toContain("Waiting for the other person");
    await vi.advanceTimersByTimeAsync(8_100 - (Date.now() - start));
    await settle([one.table]);
    expect(one.querySelector('.ftg-banner [data-kit="retry"]')).not.toBeNull();
    expect(one.querySelector(".ftg-banner").textContent.replace(/\s+/g, " ")).toContain("Tap above to invite them.");
    for (let second = 0; second < 300; second += 1) {
      await vi.advanceTimersByTimeAsync(1_000);
      await settle([one.table], 2);
    }
    const gaps = hellos.slice(1).map((at, index) => at - hellos[index]);
    expect(hellos[0]).toBeLessThan(100);
    expect(hellos).toHaveLength(9);
    for (const gap of gaps) expect(gap).toBeGreaterThanOrEqual(23_000), expect(gap).toBeLessThan(23_200);
  }, 30_000);
});

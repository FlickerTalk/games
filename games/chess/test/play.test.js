import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Chess } from "chess.js";
import { KV, PROTOCOL, fromBase64, seal } from "../../../kit/src/envelope.js";
import { MATCH_LIMIT, TIMING } from "../../../kit/src/table.js";
import { fakeCore, phones, settle, within } from "../../../kit/test/helpers.js";
import { initial, play, result, turn } from "../src/rules.js";
import { ART } from "../src/theme.js";
import "../src/index.js";

async function tick() {
  const tables = () => [...document.querySelectorAll("ft-chess")].map((element) => element.table);
  await settle(tables());
  await vi.advanceTimersByTimeAsync(400);
  await settle(tables());
}
const text = (element) => element.textContent.replace(/\s+/g, " ");
const fen = (element) => element.table.view.state.fen;
const corner = (element) => element.querySelector(".ftg-board button[data-square]")?.dataset.square;
const square = (element, name) => element.querySelector(`.ftg-board button[data-square="${name}"]`);
const marked = (element, name) => [...element.querySelectorAll(".ftg-board button[data-mark]")].filter((one) => one.dataset.mark.split(" ").includes(name)).map((one) => one.dataset.square).sort();
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
  const node = within(element, selector);
  if (!node) throw new Error(`nothing to touch: ${selector}`);
  node.click();
  await tick();
}

function tap(element, name) {
  square(element, name)?.click();
}

async function move(element, uci) {
  tap(element, uci.slice(0, 2));
  tap(element, uci.slice(2, 4));
  if (uci[4]) element.querySelector(`.ftg-board button[data-promote="${uci[4]}"]`)?.click();
  await tick();
}

async function game(white, black, moves) {
  for (const [at, uci] of moves.entries()) await move(at % 2 ? black : white, uci);
}

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

describe("chess against the phone", () => {
  it("lets the phone answer by the rules, in the conversation, without a word on the live channel", async () => {
    vi.useRealTimers();
    vi.useFakeTimers({ toNotFake: ["Date"] });
    const core = fakeCore();
    const one = await phone(core, { live: false, solo: true });
    one.table.random = () => new Uint8Array(32);
    await touch(one, '[data-kit="new"]');
    expect(one.table.view.mySide).toBe(0);
    await move(one, "e2e4");
    await vi.advanceTimersByTimeAsync(TIMING.think);
    await tick();
    const [mine, theirs] = one.table.record.game.moves;
    expect(mine).toBe("e2e4");
    const answered = play(play(initial(), mine, 0).state, theirs, 1);
    expect(answered.error).toBeUndefined();
    expect(fen(one)).toBe(answered.state.fen);
    expect(one.table.view.myTurn).toBe(true);
    expect(core.ft.live.send).not.toHaveBeenCalled();
  });

  it("plays a whole round against the phone to its end, the phone always Flick and never a word on the live channel", async () => {
    vi.useRealTimers();
    vi.useFakeTimers({ toNotFake: ["Date"] });
    const core = fakeCore();
    const one = await phone(core, { live: false, solo: true });
    one.table.random = () => new Uint8Array(32);
    await touch(one, '[data-kit="new"]');
    for (let turn = 0; one.table.view.phase === "play" && turn < 200; turn += 1) {
      if (one.table.view.myTurn) await move(one, new Chess(one.table.view.state.fen).moves({ verbose: true })[0].lan);
      await vi.advanceTimersByTimeAsync(TIMING.think);
      await tick();
    }
    expect(one.table.view.phase).toBe("over");
    expect(text(one)).toMatch(/You (won|lost)|Draw/);
    expect(one.querySelector('.ftg-bar canvas[data-side="them"]').dataset.who).toBe("flick");
    expect(one.querySelector('[data-kit="send"]')).toBeNull();
    expect(core.ft.live.send).not.toHaveBeenCalled();
  }, 60_000);
});

describe("chess between two phones", () => {
  it("gives white to the side the coin says starts, each board turned its way, and plays a game to checkmate", async () => {
    const { white, black } = await match();
    expect(white.table.view.mySide).toBe(0);
    expect(black.table.view.mySide).toBe(1);
    expect(text(white)).toContain("The coin says you start");
    expect(text(black)).toContain("The coin says they start");
    expect(corner(white)).toBe("a8");
    expect(corner(black)).toBe("h1");
    expect(white.querySelector(".ftg-player.me .ftc-side").innerHTML).toContain(ART.pieces[0].fill);
    expect(black.querySelector(".ftg-player.me .ftc-side").innerHTML).toContain(ART.pieces[1].fill);

    await move(black, "e7e5");
    expect(black.table.record.game.moves).toEqual([]);

    await game(white, black, ["e2e4", "e7e5", "f1c4", "b8c6", "d1h5", "g8f6", "h5f7"]);
    for (const side of [white, black]) {
      expect(fen(side)).toBe("r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4");
      expect(side.querySelector(".ftg-toast").textContent).toContain("Checkmate");
      expect(marked(side, "check")).toEqual(["e8"]);
    }
    expect(text(white)).toContain("You won");
    expect(text(black)).toContain("You lost");

    await touch(black, '[data-kit="back"]');
    expect(black.querySelector(".ftg-board canvas")).toBeNull();
    await touch(white, '[data-kit="send"]');
    expect(white.ft.say).toHaveBeenCalledWith("♟️ Chess: I won (white) · Checkmate · moves: 4\n\n1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0");
  });

  it("plays the next round with the colours swapped", async () => {
    const { white, black } = await match();
    await game(white, black, ["f2f3", "e7e5", "g2g4", "d8h4"]);
    expect(text(black)).toContain("You won");
    await touch(black, '[data-kit="again"]');
    expect(black.table.view.mySide).toBe(0);
    expect(corner(black)).toBe("a8");
    expect(corner(white)).toBe("h1");
    await move(black, "d2d4");
    expect(fen(white)).toBe("rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1");
  });

  it("promotes a pawn to the piece picked on one phone, and the other sees it", async () => {
    const { white, black } = await match();
    await game(white, black, ["a2a4", "b7b5", "a4b5", "a7a6", "b5a6", "c8b7", "a6b7", "b8c6"]);
    tap(white, "b7");
    tap(white, "a8");
    await tick();
    expect(white.table.record.game.moves.at(-1)).toBe("b8c6");
    const rook = white.querySelector('.ftg-board button[data-promote="r"]');
    expect(rook.getAttribute("aria-label")).toBe("Rook");
    rook.click();
    await tick();
    expect(black.table.record.game.moves.at(-1)).toBe("b7a8r");
    expect(fen(black).split("/")[0]).toBe("R2qkbnr");
    expect(square(black, "a8").dataset.piece).toBe("wr");
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
    expect(marked(white, "pending")).toEqual(["e4"]);
    expect(black.table.record.game.moves).toEqual([]);
    white.ft.live.send = send;
    await touch(white, '[data-kit="back"]');
    await touch(white, '[data-kit="enter"]');
    expect(black.table.record.game.moves).toEqual(["e2e4"]);
    expect(marked(white, "pending")).toEqual([]);
    expect(marked(white, "last")).toEqual(["e2", "e4"]);
    await move(black, "c7c5");
    expect(white.table.record.game.moves).toEqual(["e2e4", "c7c5"]);
  });

  it("goes on from what each phone kept when the side that closed the game opens it again", async () => {
    const { a, b, white, black } = await match();
    await game(white, black, ["e2e4", "e7e5"]);
    const [whiteCore, blackCore] = white.ft === a.ft ? [a, b] : [b, a];
    blackCore.closed = true;
    blackCore.wire = () => {};
    black.table.stopTimers();
    black.remove();
    await move(white, "g1f3");
    await vi.advanceTimersByTimeAsync(8_100);
    expect(text(white)).toContain("The other person does not have “Chess” open in this conversation.");

    const back = fakeCore({ records: blackCore.records });
    whiteCore.wire = (data) => setTimeout(() => back.hear(data), 0);
    back.wire = (data) => setTimeout(() => whiteCore.hear(data), 0);
    const again = await phone(back);
    expect(again.table.screen).toBe("list");
    await vi.advanceTimersByTimeAsync(15_000);
    await tick();
    expect(again.table.screen).toBe("match");
    expect(fen(again)).toBe("rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2");
    expect(corner(again)).toBe("h1");
    await move(again, "b8c6");
    expect(white.table.record.game.moves).toEqual(["e2e4", "e7e5", "g1f3", "b8c6"]);
  });

  it("carries a game of 150 moves in one message, far below the kit's limit", async () => {
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
    expect(text(one)).toContain("The other person has to open this game too.");
    await vi.advanceTimersByTimeAsync(8_100 - (Date.now() - start));
    await settle([one.table]);
    expect(one.querySelector('.ftg-bar [data-kit="retry"]')).not.toBeNull();
    expect(one.querySelector(".ftg-toast").textContent.replace(/\s+/g, " ")).toContain("Tap above to invite them.");
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

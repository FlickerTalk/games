import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { replay } from "../../../kit/src/match.js";
import { robotMove } from "../../../kit/src/robot.js";
import { playOut, seeded } from "../../../kit/test/helpers.js";
import { evaluate, robot } from "../src/robot.js";
import { initial, play, result, turn } from "../src/rules.js";

const game = { initial, play, result, turn, robot };
const phone = (random, settings = {}) => {
  const tuned = { ...game, robot: { ...robot, ...settings } };
  return (state, side) => robotMove(tuned, state, side, {}, random);
};
const uci = (move) => move.from + move.to + (move.promotion ?? "");
const anyLegal = (random) => (state) => {
  const legal = new Chess(state.fen).moves({ verbose: true });
  return uci(legal[Math.floor(random() * legal.length)]);
};
const at = (fen, prev = null) => ({ fen, prev });
const sideOf = (fen) => (fen.split(" ")[1] === "w" ? 0 : 1);
const answer = (fen, prev = null, settings = {}) => ({ ...robot, ...settings }).move(at(fen, prev), sideOf(fen), {}, () => 0);
const after = (fen, move) => {
  const chess = new Chess(fen);
  chess.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion: move[4] });
  return chess;
};
const lineOf = (moves) => moves.reduce((state, move) => play(state, move, turn(state)).state, initial());

describe("the chess robot", () => {
  it("answers in the moves the rules take, from the first move on", () => {
    const move = robotMove(game, initial(), 0, {}, () => 0);
    expect(play(initial(), move, 0).error).toBeUndefined();
    const opened = lineOf(["e2e4"]);
    expect(play(opened, robotMove(game, opened, 1, {}, () => 0), 1).error).toBeUndefined();
  });

  it("weighs material and where the pieces stand, from the side's point of view", () => {
    expect(evaluate(initial().fen, 0)).toBe(0);
    const queenUp = "4k3/8/8/8/8/8/8/3QK3 w - - 0 1";
    expect(evaluate(queenUp, 0)).toBeGreaterThan(800);
    expect(evaluate(queenUp, 1)).toBe(-evaluate(queenUp, 0));
    const centred = "4k3/8/8/8/3N4/8/8/4K3 w - - 0 1";
    const cornered = "4k3/8/8/8/8/8/8/N3K3 w - - 0 1";
    expect(evaluate(centred, 0)).toBeGreaterThan(evaluate(cornered, 0));
  });

  it("mates in one when it can", () => {
    const move = answer("6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1");
    expect(move).toBe("a1a8");
    expect(after("6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1", move).isCheckmate()).toBe(true);
  });

  it("promotes a pawn to a queen, on either side", () => {
    expect(answer("8/P7/8/8/8/8/8/2K4k w - - 0 1")).toBe("a7a8q");
    expect(answer("K7/8/8/8/8/8/5p2/7k b - - 0 1")).toBe("f2f1q");
  });

  it("gets out of check with a legal move", () => {
    const fen = "4k3/8/8/8/8/8/8/4R1K1 b - - 0 1";
    const legal = new Chess(fen).moves({ verbose: true }).map(uci);
    expect(legal).toContain(answer(fen));
  });

  it("does not take a pawn when taking it leaves the other side stalemated", () => {
    for (const [fen, greedy] of [
      ["2k1K3/p7/8/8/Q7/8/8/8 w - - 0 1", "a4a7"],
      ["7k/8/6p1/6Q1/8/8/8/3K4 w - - 0 1", "g5g6"],
    ]) {
      const move = answer(fen);
      expect(move).not.toBe(greedy);
      expect(after(fen, move).isStalemate()).toBe(false);
    }
  });

  it("when it is ahead, does not play into a position seen twice already", () => {
    const fen = "8/8/8/4k3/8/8/8/K6Q w - - 0 1";
    const fixed = { depth: 2, budgetMs: Infinity };
    const first = answer(fen, null, fixed);
    const seen = after(fen, first).fen();
    const again = answer(fen, at(seen, at(seen)), fixed);
    expect(again).not.toBe(first);
    expect(new Chess(fen).moves({ verbose: true }).map(uci)).toContain(again);
  });

  it("gives no move when the round is over", () => {
    const mated = lineOf(["f2f3", "e7e5", "g2g4", "d8h4"]);
    expect(result(mated)).toMatchObject({ winner: 1, reason: "checkmate" });
    expect(robot.move(mated, 0, {}, () => 0)).toBeNull();
  });

  it("plays a whole match against itself, every move legal, and it ends", () => {
    const random = seeded(9);
    const quick = phone(random, { depth: 2, budgetMs: Infinity });
    const { moves, result: ended } = playOut(game, [quick, quick]);
    expect(replay({ a: "a", b: "b", first: "a", moves }, game).ok).toBe(true);
    expect(ended).not.toBeNull();
  }, 60_000);

  it("beats a player who picks any legal move, whoever starts", () => {
    let won = 0;
    for (let seed = 1; seed <= 10; seed += 1) {
      const random = seeded(seed);
      const robotSide = seed % 2;
      const smart = phone(random, { depth: 2, budgetMs: Infinity });
      const players = robotSide === 0 ? [smart, anyLegal(random)] : [anyLegal(random), smart];
      if (playOut(game, players).result.winner === robotSide) won += 1;
    }
    expect(won).toBeGreaterThanOrEqual(9);
  }, 60_000);

  it("answers within a second at its own depth and budget, all through a match", () => {
    const random = seeded(15);
    let worst = 0;
    const timed = (state, side) => {
      const started = performance.now();
      const move = robotMove(game, state, side, {}, random);
      worst = Math.max(worst, performance.now() - started);
      return move;
    };
    const { result: ended } = playOut(game, [anyLegal(random), timed]);
    expect(ended.winner).toBe(1);
    expect(worst).toBeLessThan(1000);
  }, 60_000);
});

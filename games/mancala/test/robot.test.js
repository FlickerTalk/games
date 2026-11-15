import { describe, expect, it } from "vitest";
import { replay } from "../../../kit/src/match.js";
import { robotMove } from "../../../kit/src/robot.js";
import { anyLegal, playOut, seeded } from "../../../kit/test/helpers.js";
import { robot } from "../src/robot.js";
import { STORE, initial, play, result, turn } from "../src/rules.js";

const game = { initial, play, result, turn, robot };
const phone = (random, settings = {}) => {
  const tuned = { ...game, robot: { ...robot, ...settings } };
  return (state, side) => robotMove(tuned, state, side, {}, random);
};
const position = (pits, next) => ({ pits, next });

function wholeTurn(state, side) {
  const played = [];
  while (turn(state) === side && !result(state)) {
    const move = robotMove(game, state, side, {}, () => 0);
    played.push(move);
    state = play(state, move, side).state;
  }
  return { played, state };
}

describe("the mancala robot", () => {
  it("lists the pits with seeds, those that end in its store first", () => {
    expect(robot.moves(initial(), 0)[0]).toBe(2);
    expect([...robot.moves(initial(), 0)].sort()).toEqual([0, 1, 2, 3, 4, 5]);
    expect(robot.moves({ ...initial(), next: 1 }, 1)[0]).toBe(2);
    expect(robot.moves(position([0, 3, 0, 0, 1, 0, 0, 4, 4, 4, 4, 4, 4, 0], 0), 0).sort()).toEqual([1, 4]);
  });

  it("values the seeds in its store most, then those on its side", () => {
    expect(robot.score(initial(), 0)).toBe(0);
    const stored = position([4, 4, 4, 4, 4, 3, 1, 4, 4, 4, 4, 4, 4, 0], 1);
    const sown = position([4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 3, 1], 1);
    expect(robot.score(stored, 0)).toBeGreaterThan(0);
    expect(robot.score(stored, 1)).toBe(-robot.score(stored, 0));
    expect(robot.score(stored, 0)).toBeGreaterThan(robot.score(position([4, 4, 4, 4, 4, 5, 0, 4, 4, 4, 4, 4, 3, 0], 1), 0));
    expect(robot.score(sown, 1)).toBe(robot.score(stored, 0));
  });

  it("captures a big pile when it can", () => {
    expect(robotMove(game, position([1, 0, 3, 0, 0, 0, 10, 2, 2, 2, 2, 10, 2, 10], 0), 0, {}, () => 0)).toBe(0);
  });

  it("keeps a big pile out of the other side's reach rather than take a small capture", () => {
    expect(robotMove(game, position([1, 0, 0, 8, 0, 0, 16, 3, 1, 0, 3, 3, 3, 10], 0), 0, {}, () => 0)).toBe(3);
  });

  it("ends in its store and plays again, to capture with its next move", () => {
    const { played, state } = wholeTurn(position([0, 0, 0, 2, 0, 1, 10, 10, 2, 2, 2, 2, 2, 10], 0), 0);
    expect(played).toEqual([5, 3]);
    expect(state.pits[STORE[0]]).toBe(22);
  });

  it("plays a whole match against itself, every move legal, and it ends", () => {
    const random = seeded(8);
    const quick = phone(random, { depth: 6, budgetMs: Infinity });
    const { moves, result: ended } = playOut(game, [quick, quick]);
    expect(replay({ a: "a", b: "b", first: "a", moves }, game).ok).toBe(true);
    expect(ended.first + ended.second).toBe(48);
  });

  it("beats a player who picks any legal move, whoever starts", () => {
    let won = 0;
    for (let seed = 1; seed <= 10; seed += 1) {
      const random = seeded(seed);
      const robotSide = seed % 2;
      const smart = phone(random, { depth: 6, budgetMs: Infinity });
      const players = robotSide === 0 ? [smart, anyLegal(game, random)] : [anyLegal(game, random), smart];
      if (playOut(game, players).result.winner === robotSide) won += 1;
    }
    expect(won).toBeGreaterThanOrEqual(9);
  });

  it("answers within a second at its own depth and budget, all through a match", () => {
    const random = seeded(14);
    let worst = 0;
    const timed = (state, side) => {
      const started = performance.now();
      const move = robotMove(game, state, side, {}, random);
      worst = Math.max(worst, performance.now() - started);
      return move;
    };
    const { result: ended } = playOut(game, [anyLegal(game, random), timed]);
    expect(ended.winner).toBe(1);
    expect(worst).toBeLessThan(1000);
  }, 60_000);
});

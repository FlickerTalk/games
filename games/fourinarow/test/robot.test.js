import { describe, expect, it } from "vitest";
import { replay } from "../../../kit/src/match.js";
import { robotMove } from "../../../kit/src/robot.js";
import { anyLegal, playOut, seeded } from "../../../kit/test/helpers.js";
import { robot } from "../src/robot.js";
import { initial, play, result, turn } from "../src/rules.js";

const game = { initial, play, result, turn, robot };
const phone = (random, settings = {}) => {
  const tuned = { ...game, robot: { ...robot, ...settings } };
  return (state, side) => robotMove(tuned, state, side, {}, random);
};
const dropped = (columns) => columns.reduce((state, column) => play(state, column, turn(state)).state, initial());

describe("the Four in a Row robot", () => {
  it("lists the columns with room, from the centre out", () => {
    expect(robot.moves(initial(), 0)).toEqual([3, 2, 4, 1, 5, 0, 6]);
    expect(robot.moves(dropped([3, 3, 3, 3, 3, 3]), 0)).toEqual([2, 4, 1, 5, 0, 6]);
  });

  it("values discs that can still make four, the centre most", () => {
    expect(robot.score(initial(), 0)).toBe(0);
    expect(robot.score(dropped([3]), 0)).toBeGreaterThan(robot.score(dropped([0]), 0));
    expect(robot.score(dropped([3]), 1)).toBe(-robot.score(dropped([3]), 0));
  });

  it("drops the disc that makes four, and blocks the other side's", () => {
    expect(robotMove(game, dropped([0, 6, 1, 6, 2]), 1, {}, () => 0)).toBe(3);
    expect(robotMove(game, dropped([0, 6, 1, 6, 2, 5]), 0, {}, () => 0)).toBe(3);
  });

  it("plays a whole match against itself, every move legal, and it ends", () => {
    const random = seeded(7);
    const { moves, result: ended } = playOut(game, [phone(random), phone(random)]);
    expect(replay({ a: "a", b: "b", first: "a", moves }, game).ok).toBe(true);
    expect(ended).not.toBeNull();
  });

  it("beats a player who picks any legal move, whoever starts", () => {
    let won = 0;
    for (let seed = 1; seed <= 10; seed += 1) {
      const random = seeded(seed);
      const robotSide = seed % 2;
      const smart = phone(random, { depth: 4, budgetMs: Infinity });
      const players = robotSide === 0 ? [smart, anyLegal(game, random)] : [anyLegal(game, random), smart];
      if (playOut(game, players).result.winner === robotSide) won += 1;
    }
    expect(won).toBeGreaterThanOrEqual(9);
  });
});

import { describe, expect, it } from "vitest";
import { replay } from "../../../kit/src/match.js";
import { robotMove } from "../../../kit/src/robot.js";
import { anyLegal, playOut, seeded } from "../../../kit/test/helpers.js";
import { robot } from "../src/robot.js";
import { initial, moves, play, result, turn } from "../src/rules.js";

const game = { initial, play, result, turn, robot };
const phone = (random, settings = {}) => {
  const tuned = { ...game, robot: { ...robot, ...settings } };
  return (state, side) => robotMove(tuned, state, side, {}, random);
};
const position = (rows, next) => ({ cells: [...rows.join("")].map((cell) => (cell === "x" ? 0 : cell === "o" ? 1 : null)), next });

describe("the Reversi robot", () => {
  it("lists every legal move of the side to play, corners first", () => {
    expect(robot.moves(initial(), 0).sort((a, b) => a - b)).toEqual(moves(initial().cells, 0));
    const open = position(["........", ".o......", "..x.....", "...xo...", "...ox...", "........", "........", "........"], 0);
    expect(robot.moves(open, 0)[0]).toBe(0);
    expect(robot.moves(open, 0).sort((a, b) => a - b)).toEqual(moves(open.cells, 0));
  });

  it("values corners and the moves left to each side", () => {
    expect(robot.score(initial(), 0)).toBe(0);
    const cornered = position(["x.......", ".o......", "..o.....", "...xo...", "...ox...", "........", "........", "........"], 1);
    expect(robot.score(cornered, 0)).toBeGreaterThan(0);
    expect(robot.score(cornered, 1)).toBe(-robot.score(cornered, 0));
  });

  it("takes a corner when it is there to take", () => {
    const open = position(["........", ".o......", "..x.....", "...xo...", "...ox...", "........", "........", "........"], 0);
    expect(robotMove(game, open, 0, {}, () => 0)).toBe(0);
  });

  it("plays a whole match against itself, every move legal, passes included, and it ends", () => {
    const random = seeded(3);
    const { moves: played, result: ended } = playOut(game, [phone(random), phone(random)]);
    expect(replay({ a: "a", b: "b", first: "a", moves: played }, game).ok).toBe(true);
    expect(ended).not.toBeNull();
  });

  it("beats a player who picks any legal move, whoever starts", () => {
    let won = 0;
    for (let seed = 1; seed <= 10; seed += 1) {
      const random = seeded(seed);
      const robotSide = seed % 2;
      const smart = phone(random, { depth: 2, budgetMs: Infinity });
      const players = robotSide === 0 ? [smart, anyLegal(game, random)] : [anyLegal(game, random), smart];
      if (playOut(game, players).result.winner === robotSide) won += 1;
    }
    expect(won).toBeGreaterThanOrEqual(9);
  });
});

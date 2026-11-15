import { describe, expect, it } from "vitest";
import { replay } from "../../../kit/src/match.js";
import { robotMove } from "../../../kit/src/robot.js";
import { anyLegal, playOut, seeded } from "../../../kit/test/helpers.js";
import { robot } from "../src/robot.js";
import { initial, play, result, turn } from "../src/rules.js";

const game = { initial, play, result, turn, robot };
const phone = (random) => (state, side) => robotMove(game, state, side, {}, random);
const board = (text) => ({ cells: [...text].map((cell) => (cell === "x" ? 0 : cell === "o" ? 1 : null)) });

describe("the Tic-Tac-Toe robot", () => {
  it("lists the empty cells, the centre first, then the corners", () => {
    expect(robot.moves(initial(), 0)).toEqual([4, 0, 2, 6, 8, 1, 3, 5, 7]);
    expect(robot.moves(board("x...o...x"), 1)).toEqual([2, 6, 1, 3, 5, 7]);
  });

  it("searches to the end of the round", () => {
    expect(robot.depth).toBe(9);
  });

  it("takes a line it can close, and blocks the other side's", () => {
    expect(robotMove(game, board("xx.oo...."), 0, {}, () => 0)).toBe(2);
    expect(robotMove(game, board("xx..o...."), 1, {}, () => 0)).toBe(2);
  });

  it("plays a whole match against itself, every move legal, and it ends in a draw", () => {
    for (let seed = 1; seed <= 4; seed += 1) {
      const random = seeded(seed);
      const { moves, result: ended } = playOut(game, [phone(random), phone(random)]);
      expect(replay({ a: "a", b: "b", first: "a", moves }, game).ok).toBe(true);
      expect(ended.winner).toBeNull();
    }
  });

  it("never loses to a player who picks any legal move, whoever starts", () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const random = seeded(seed);
      const robotSide = seed % 2;
      const players = robotSide === 0 ? [phone(random), anyLegal(game, random)] : [anyLegal(game, random), phone(random)];
      expect(playOut(game, players).result.winner, `seed ${seed}`).not.toBe(1 - robotSide);
    }
  });
});

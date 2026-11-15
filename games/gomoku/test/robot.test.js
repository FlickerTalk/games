import { describe, expect, it } from "vitest";
import { replay } from "../../../kit/src/match.js";
import { robotMove } from "../../../kit/src/robot.js";
import { playOut, seeded } from "../../../kit/test/helpers.js";
import { robot } from "../src/robot.js";
import { CELLS, SIZE, initial, play, result, turn } from "../src/rules.js";

const game = { initial, play, result, turn, robot };
const phone = (random, settings = {}) => {
  const tuned = { ...game, robot: { ...robot, ...settings } };
  return (state, side) => robotMove(tuned, state, side, {}, random);
};
const anyFree = (random) => (state) => {
  const free = state.cells.flatMap((stone, cell) => (stone === null ? [cell] : []));
  return free[Math.floor(random() * free.length)];
};
const at = (row, col) => row * SIZE + col;

function stones(black, white) {
  const cells = Array(CELLS).fill(null);
  for (const cell of black) cells[cell] = 0;
  for (const cell of white) cells[cell] = 1;
  return { cells, count: black.length + white.length };
}

const four = [at(7, 4), at(7, 5), at(7, 6), at(7, 7)];
const far = [at(0, 0), at(0, 14), at(14, 0)];

describe("the Five in a Row robot", () => {
  it("opens in the centre, then lists free intersections near the stones, the most urgent first", () => {
    expect(robot.moves(initial(), 0)).toEqual([at(7, 7)]);
    const one = stones([at(7, 7)], []);
    const near = robot.moves(one, 1);
    expect(near.length).toBeGreaterThan(0);
    for (const cell of near) {
      expect(one.cells[cell]).toBeNull();
      expect(Math.abs(Math.floor(cell / SIZE) - 7)).toBeLessThanOrEqual(2);
      expect(Math.abs((cell % SIZE) - 7)).toBeLessThanOrEqual(2);
    }
    const winning = stones(four, [at(7, 3), ...far]);
    expect(robot.moves(winning, 0)[0]).toBe(at(7, 8));
  });

  it("values lines that can still make five, and a four for the side to play most", () => {
    expect(robot.score(initial(), 0)).toBe(0);
    const ahead = stones([at(7, 6), at(7, 7)], [at(0, 0)]);
    expect(robot.score(ahead, 0)).toBeGreaterThan(0);
    expect(robot.score(ahead, 1)).toBe(-robot.score(ahead, 0));
    const toPlay = stones(four, [at(7, 3), ...far]);
    expect(robot.score(toPlay, 0)).toBeGreaterThan(10 * robot.score(ahead, 0));
  });

  it("makes five when it can", () => {
    expect(robotMove(game, stones(four, [at(7, 3), ...far]), 0, {}, () => 0)).toBe(at(7, 8));
  });

  it("blocks the other side's five", () => {
    expect(robotMove(game, stones([...four, at(14, 14)], [at(7, 3), ...far]), 1, {}, () => 0)).toBe(at(7, 8));
  });

  it("makes its own five rather than block the other side's", () => {
    const both = stones([...four, at(14, 14), at(3, 6)], [at(7, 3), at(3, 2), at(3, 3), at(3, 4), at(3, 5)]);
    expect(robotMove(game, both, 1, {}, () => 0)).toBe(at(3, 1));
    expect(play(both, at(3, 1), 1).state.line).toBeTruthy();
  });

  it("closes an open three at one of its ends before it becomes an open four", () => {
    const three = stones([at(7, 5), at(7, 6), at(7, 7)], [at(0, 0), at(0, 14)]);
    expect([at(7, 4), at(7, 8)]).toContain(robotMove(game, three, 1, {}, () => 0));
  });

  it("plays a whole match against itself, every move legal, and it ends", () => {
    const random = seeded(4);
    const quick = phone(random, { depth: 2, budgetMs: Infinity });
    const { moves, result: ended } = playOut(game, [quick, quick]);
    expect(replay({ a: "a", b: "b", first: "a", moves }, game).ok).toBe(true);
    expect(ended).not.toBeNull();
  });

  it("beats a player who picks any free intersection, whoever starts", () => {
    let won = 0;
    for (let seed = 1; seed <= 10; seed += 1) {
      const random = seeded(seed);
      const robotSide = seed % 2;
      const smart = phone(random, { depth: 2, budgetMs: Infinity });
      const players = robotSide === 0 ? [smart, anyFree(random)] : [anyFree(random), smart];
      if (playOut(game, players).result.winner === robotSide) won += 1;
    }
    expect(won).toBeGreaterThanOrEqual(9);
  });

  it("answers within a second at its own depth and budget, all through a match", () => {
    const random = seeded(12);
    let worst = 0;
    const timed = (state, side) => {
      const started = performance.now();
      const move = robotMove(game, state, side, {}, random);
      worst = Math.max(worst, performance.now() - started);
      return move;
    };
    const { result: ended } = playOut(game, [anyFree(random), timed]);
    expect(ended.winner).toBe(1);
    expect(worst).toBeLessThan(1000);
  }, 60_000);
});

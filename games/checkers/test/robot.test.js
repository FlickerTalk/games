import { describe, expect, it } from "vitest";
import { replay } from "../../../kit/src/match.js";
import { robotMove } from "../../../kit/src/robot.js";
import { anyLegal, playOut, seeded } from "../../../kit/test/helpers.js";
import { robot } from "../src/robot.js";
import { initial, legalMoves, play, result, turn } from "../src/rules.js";

const game = { initial, play, result, turn, robot };
const phone = (random, settings = {}) => {
  const tuned = { ...game, robot: { ...robot, ...settings } };
  return (state, side) => robotMove(tuned, state, side, {}, random);
};

function board(rows, next) {
  const marks = { d: 0, l: 1, D: 2, L: 3 };
  return { cells: rows.join("").split("").map((mark) => (mark in marks ? marks[mark] : null)), next, quiet: 0 };
}

const twoOrOne = board(["........", "........", ".....d.d", "....l.l.", "........", "..l.....", "........", "........"], 0);
const intoAJump = board(["........", "........", ".d......", "........", ".l......", "........", "........", "........"], 0);
const threatened = board(["........", "..d.....", "........", "........", "........", "......l.", "...d....", "....l..."], 0);

describe("the checkers robot", () => {
  it("lists every legal move of the side to play, the captures that take most first", () => {
    expect([...robot.moves(initial(), 0)].sort()).toEqual([...legalMoves(initial(), 0)].sort());
    expect(robot.moves(twoOrOne, 0)[0]).toBe("21-35-49");
    expect([...robot.moves(twoOrOne, 0)].sort()).toEqual([...legalMoves(twoOrOne, 0)].sort());
  });

  it("values men, kings more, and men closer to being crowned, from the side's point of view", () => {
    expect(robot.score(initial(), 0)).toBe(0);
    const king = board(["........", "...D....", "........", "........", "........", "........", "....l...", "........"], 0);
    expect(robot.score(king, 0)).toBeGreaterThan(0);
    expect(robot.score(king, 1)).toBe(-robot.score(king, 0));
    const near = board(["........", "........", "........", "........", "........", "..d.....", "........", "........"], 0);
    const far = board(["........", "..d.....", "........", "........", "........", "........", "........", "........"], 0);
    expect(robot.score(near, 0)).toBeGreaterThan(robot.score(far, 0));
  });

  it("takes two pieces rather than one", () => {
    expect(robotMove(game, twoOrOne, 0, {}, () => 0)).toBe("21-35-49");
  });

  it("steps where it cannot be jumped, and saves a threatened man by crowning it", () => {
    expect(robotMove(game, intoAJump, 0, {}, () => 0)).toBe("17-24");
    expect(robotMove(game, threatened, 0, {}, () => 0)).toBe("51-58");
  });

  it("plays a whole match against itself, every move legal, and it ends", () => {
    const random = seeded(5);
    const quick = phone(random, { depth: 4, budgetMs: Infinity });
    const { moves, result: ended } = playOut(game, [quick, quick]);
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

  it("answers within a second at its own depth and budget, all through a match", () => {
    const random = seeded(11);
    let worst = 0;
    const timed = (state, side) => {
      const started = performance.now();
      const move = robotMove(game, state, side, {}, random);
      worst = Math.max(worst, performance.now() - started);
      return move;
    };
    const { result: ended } = playOut(game, [timed, anyLegal(game, random)]);
    expect(ended.winner).toBe(0);
    expect(worst).toBeLessThan(1000);
  }, 60_000);
});

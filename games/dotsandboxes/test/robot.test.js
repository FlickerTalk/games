import { describe, expect, it } from "vitest";
import { replay } from "../../../kit/src/match.js";
import { robotMove } from "../../../kit/src/robot.js";
import { playOut, seeded } from "../../../kit/test/helpers.js";
import { robot } from "../src/robot.js";
import { BOXES, H, LINES, initial, play, result, sidesOf, turn } from "../src/rules.js";

const game = { initial, play, result, turn, robot };
const phone = (random, settings = {}) => {
  const tuned = { ...game, robot: { ...robot, ...settings } };
  return (state, side) => robotMove(tuned, state, side, {}, random);
};
const anyFree = (random) => (state) => {
  const free = state.lines.flatMap((drawn, line) => (drawn ? [] : [line]));
  return free[Math.floor(random() * free.length)];
};
const across = (row, col) => row * BOXES + col;
const down = (row, col) => H + row * (BOXES + 1) + col;

function drawn(lines, next, owners = {}) {
  const state = initial();
  for (const line of lines) state.lines[line] = true;
  for (let box = 0; box < BOXES * BOXES; box += 1) {
    if (sidesOf(box).every((line) => state.lines[line])) state.boxes[box] = owners[box] ?? box % 2;
  }
  return { ...state, next };
}

const ROW = [0, 1, 2, 3].map((col) => down(0, col));
const OPEN = [...ROW, down(0, 4), across(4, 3), down(3, 4)];
const endgame = drawn(Array.from({ length: LINES }, (_, line) => line).filter((line) => !OPEN.includes(line)), 0);

describe("the dots and boxes robot", () => {
  it("lists only the lines that close a box when there are some and no chain ends in two boxes", () => {
    const three = drawn([across(0, 0), across(1, 0), down(0, 0)], 0);
    expect(robot.moves(three, 0)).toEqual([down(0, 1)]);
  });

  it("leaves out the lines that hand a box over while there is a safe one", () => {
    const two = drawn([across(0, 0), down(0, 0)], 0);
    const listed = robot.moves(two, 0);
    expect(listed).not.toContain(across(1, 0));
    expect(listed).not.toContain(down(0, 1));
    expect(listed).toHaveLength(LINES - 4);
  });

  it("when every line hands boxes over, lists only those that hand over the fewest", () => {
    expect([...robot.moves(endgame, 0)].sort((a, b) => a - b)).toEqual([across(4, 3), down(3, 4)].sort((a, b) => a - b));
  });

  it("opens the shortest chain at its own depth and budget, never a long one beside it", () => {
    const sixAndOne = drawn([2, 3, 5, 7, 10, 12, 13, 15, 16, 18, 20, 21, 25, 26, 28, 30, 32, 34, 37, 39], 0);
    const fourAndTwo = drawn([0, 1, 2, 5, 6, 7, 14, 15, 16, 17, 18, 20, 24, 25, 27, 29, 30, 31, 32, 34, 36, 39], 0);
    for (const draw of [0, 0.5, 0.99]) {
      expect([across(0, 1), down(0, 2), down(0, 3), down(0, 4)]).toContain(robotMove(game, sixAndOne, 0, {}, () => draw));
      expect([across(2, 0), across(3, 0), down(3, 0)]).toContain(robotMove(game, fourAndTwo, 0, {}, () => draw));
    }
  });

  it("values the boxes taken, and those the side to play can take at once", () => {
    expect(robot.score(initial(), 0)).toBe(0);
    const three = drawn([across(0, 0), across(1, 0), down(0, 0)], 0);
    expect(robot.score(three, 0)).toBeGreaterThan(0);
    expect(robot.score(three, 1)).toBe(-robot.score(three, 0));
    expect(robot.score({ ...three, next: 1 }, 1)).toBe(robot.score(three, 0));
  });

  it("closes a box it can close", () => {
    const three = drawn([across(0, 0), across(1, 0), down(0, 0), across(2, 2)], 0);
    expect(robotMove(game, three, 0, {}, () => 0)).toBe(down(0, 1));
  });

  it("does not hand a box over while it has a safe line", () => {
    const two = drawn([across(0, 0), down(0, 0)], 1);
    for (const draw of [0, 0.5, 0.99]) expect([across(1, 0), down(0, 1)]).not.toContain(robotMove(game, two, 1, {}, () => draw));
  });

  it("takes a whole chain, keeping the turn, and then hands over the single box rather than the chain", () => {
    expect([across(4, 3), down(3, 4)]).toContain(robotMove(game, endgame, 0, {}, () => 0));
    let state = play(endgame, down(0, 0), 0).state;
    while (turn(state) === 1 && !result(state)) state = play(state, robotMove(game, state, 1, {}, () => 0), 1).state;
    expect([0, 1, 2, 3].map((col) => state.boxes[across(0, col)])).toEqual([1, 1, 1, 1]);
  });

  it("leaves the last two boxes of an opened chain to the other side when a long chain is still to come, and keeps that one", () => {
    const top = [0, 1, 2, 3].map((col) => down(0, col + 1));
    const bottom = [0, 1, 2, 3, 4].map((col) => down(3, col));
    const twoChains = drawn(Array.from({ length: LINES }, (_, line) => line).filter((line) => ![...top, ...bottom].includes(line)), 1);
    let state = twoChains;
    while (turn(state) === 1 && !result(state)) state = play(state, robotMove(game, state, 1, {}, () => 0), 1).state;
    expect([0, 1, 2, 3].map((col) => state.boxes[across(0, col)])).toEqual([1, 1, null, null]);
    expect(state.lines[down(0, 3)]).toBe(false);
    state = play(state, down(0, 3), 0).state;
    state = play(state, down(3, 0), 0).state;
    while (turn(state) === 1 && !result(state)) state = play(state, robotMove(game, state, 1, {}, () => 0), 1).state;
    expect([0, 1, 2, 3].map((col) => state.boxes[across(3, col)])).toEqual([1, 1, 1, 1]);
  });

  it("plays a whole match against itself, every move legal, and it ends", () => {
    const random = seeded(6);
    const quick = phone(random, { depth: 2, budgetMs: Infinity });
    const { moves, result: ended } = playOut(game, [quick, quick]);
    expect(replay({ a: "a", b: "b", first: "a", moves }, game).ok).toBe(true);
    expect(ended).not.toBeNull();
    expect(ended.first + ended.second).toBe(BOXES * BOXES);
  });

  it("beats a player who draws any free line, whoever starts", () => {
    let won = 0;
    for (let seed = 1; seed <= 10; seed += 1) {
      const random = seeded(seed);
      const robotSide = seed % 2;
      const smart = phone(random, { depth: 3, budgetMs: Infinity });
      const players = robotSide === 0 ? [smart, anyFree(random)] : [anyFree(random), smart];
      if (playOut(game, players).result.winner === robotSide) won += 1;
    }
    expect(won).toBeGreaterThanOrEqual(9);
  });

  it("answers within a second at its own depth and budget, all through a match", () => {
    const random = seeded(13);
    let worst = 0;
    const timed = (state, side) => {
      const started = performance.now();
      const move = robotMove(game, state, side, {}, random);
      worst = Math.max(worst, performance.now() - started);
      return move;
    };
    const { result: ended } = playOut(game, [timed, anyFree(random)]);
    expect(ended.winner).toBe(0);
    expect(worst).toBeLessThan(1000);
  }, 60_000);
});

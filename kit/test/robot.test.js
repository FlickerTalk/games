import { describe, expect, it, vi } from "vitest";
import { WIN, robotMove, search } from "../src/robot.js";

const nim = {
  initial: () => ({ left: 10, next: 0 }),
  turn: (state) => state.next,
  play(state, move, side) {
    if (side !== state.next || state.left === 0) return { error: "turn" };
    if (![1, 2, 3].includes(move) || move > state.left) return { error: "bad" };
    return { state: { left: state.left - move, next: 1 - side, last: side } };
  },
  result: (state) => (state.left === 0 ? { winner: state.last } : null),
  robot: { moves: (state) => [1, 2, 3].filter((take) => take <= state.left), score: () => 0 },
};

const endless = {
  initial: () => ({ n: 0 }),
  turn: (state) => state.n % 2,
  play: (state, move) => ({ state: { n: state.n + 1, sum: (state.sum ?? 0) + move } }),
  result: () => null,
  robot: { moves: () => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], score: (state) => state.sum ?? 0 },
};

const twice = {
  initial: () => ({ step: 0, total: 0 }),
  turn: (state) => (state.step < 2 ? 0 : 1),
  play: (state, move, side) => ({ state: { step: state.step + 1, total: state.total + (side === 0 ? move : -move) } }),
  result: (state) => (state.step === 3 ? { winner: state.total > 0 ? 0 : 1 } : null),
  robot: { moves: (state) => (state.step === 2 ? [1, 3] : [1, 2]), score: (state) => state.total },
};

describe("the kit's search", () => {
  it("finds the winning move of a game played to the end", () => {
    expect(search(nim, { left: 5, next: 0 }, 0, { depth: 10, budgetMs: Infinity }).move).toBe(1);
    expect(search(nim, { left: 7, next: 0 }, 0, { depth: 10, budgetMs: Infinity }).move).toBe(3);
    expect(search(nim, { left: 3, next: 1 }, 1, { depth: 10, budgetMs: Infinity })).toMatchObject({ move: 3, value: WIN - 1 });
  });

  it("weighs a position it cannot see to the end with the game's score", () => {
    const greedy = search(endless, { n: 0 }, 0, { depth: 1, budgetMs: Infinity });
    expect(greedy.move).toBe(9);
    const deeper = search(endless, { n: 0 }, 0, { depth: 2, budgetMs: Infinity });
    expect(deeper).toMatchObject({ move: 9, value: 9 });
  });

  it("follows the rules' turn when one side moves twice in a row", () => {
    const found = search(twice, twice.initial(), 0, { depth: 3, budgetMs: Infinity });
    expect(found.move).toBe(2);
    expect(found.value).toBe(WIN - 3);
  });

  it("stops when its time is up and still gives a legal move", () => {
    let time = 0;
    const clock = vi.fn(() => (time += 1));
    const found = search(endless, { n: 0 }, 0, { depth: 40, budgetMs: 50, clock });
    expect(endless.robot.moves()).toContain(found.move);
    expect(clock.mock.calls.length).toBeLessThan(200);
  });

  it("finishes the first depth even when the time is already up", () => {
    let time = 0;
    const found = search(endless, { n: 0 }, 0, { depth: 5, budgetMs: 0, clock: () => (time += 1000) });
    expect(found.move).toBe(9);
  });

  it("leaves out a move the rules refuse", () => {
    const picky = { ...nim, robot: { moves: () => [7, 2], score: () => 0 } };
    expect(search(picky, { left: 5, next: 0 }, 0, { depth: 3, budgetMs: Infinity }).move).toBe(2);
  });

  it("gives no move when there is none", () => {
    const stuck = { ...nim, robot: { moves: () => [], score: () => 0 } };
    expect(search(stuck, { left: 5, next: 0 }, 0, { depth: 3, budgetMs: Infinity })).toMatchObject({ move: null, choices: [] });
  });

  it("lists every move as good as the best, within the slack it is given", () => {
    const level = { ...endless, robot: { moves: () => [1, 5, 6, 9], score: (state) => state.sum ?? 0 } };
    expect(search(level, { n: 0 }, 0, { depth: 1, budgetMs: Infinity }).choices).toEqual([9]);
    expect(search(level, { n: 0 }, 0, { depth: 1, budgetMs: Infinity, slack: 4 }).choices.sort()).toEqual([5, 6, 9]);
  });
});

describe("the phone's move", () => {
  it("is the game's own when it has one, with its memory and the random source", () => {
    const memory = { fleet: "A1" };
    const random = () => 0.5;
    const move = vi.fn(() => 2);
    const own = { ...nim, robot: { move } };
    expect(robotMove(own, { left: 5, next: 1 }, 1, memory, random)).toBe(2);
    expect(move).toHaveBeenCalledWith({ left: 5, next: 1 }, 1, memory, random);
  });

  it("is found by the search otherwise, picking at random among moves as good as the best", () => {
    const level = { ...endless, robot: { moves: () => [1, 9, 6, 9.5], score: (state) => state.sum ?? 0, depth: 1, slack: 1 } };
    expect(robotMove(level, { n: 0 }, 0, {}, () => 0)).toBe(9.5);
    expect(robotMove(level, { n: 0 }, 0, {}, () => 0.99)).toBe(9);
    expect(robotMove(nim, { left: 7, next: 0 }, 0, {}, () => 0.99)).toBe(3);
  });

  it("is null when there is nothing to play", () => {
    const stuck = { ...nim, robot: { moves: () => [], score: () => 0 } };
    expect(robotMove(stuck, { left: 5, next: 0 }, 0, {}, () => 0)).toBeNull();
  });
});

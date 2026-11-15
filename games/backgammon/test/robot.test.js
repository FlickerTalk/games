import { describe, expect, it } from "vitest";
import { replay } from "../../../kit/src/match.js";
import { robotMove } from "../../../kit/src/robot.js";
import { playOut, seeded, unseenSteps } from "../../../kit/test/helpers.js";
import { robot } from "../src/robot.js";
import { fromBase64url } from "../src/sha256.js";
import { POINTS, SEED_BYTES, commitText, initial, legalMoves, moveText, play, result, revealText, seedText, turn } from "../src/rules.js";

const game = { initial, play, result, turn, robot };

function timed(random, memory = {}, clock = { worst: 0 }) {
  return (state, side) => {
    const started = performance.now();
    const move = robotMove(game, state, side, memory, random);
    clock.worst = Math.max(clock.worst, performance.now() - started);
    return move;
  };
}

function person(random) {
  let seed = null;
  return (state, side) => {
    if (state.dice === null) {
      if (state.roll.commit === null) {
        seed = Uint8Array.from({ length: SEED_BYTES }, () => Math.floor(random() * 256));
        return commitText(seed);
      }
      if (state.roll.seed === null) return seedText(Uint8Array.from({ length: SEED_BYTES }, () => Math.floor(random() * 256)));
      return revealText(seed);
    }
    const legal = legalMoves(state);
    return legal.length ? moveText(legal[Math.floor(random() * legal.length)]) : "x";
  };
}

function position(places, { bar = [0, 0], off = [0, 0], next = 0, dice }) {
  const state = initial();
  state.points = Array.from({ length: POINTS }, () => [0, 0]);
  for (const [point, side, count] of places) state.points[point][side] = count;
  return { ...state, bar, off, next, dice, left: dice[0] === dice[1] ? [dice[0], dice[0], dice[0], dice[0]] : [...dice], roll: { commit: "x", seed: "y" } };
}

function wholeTurn(state, side, random = seeded(1)) {
  let at = state;
  for (let steps = 0; steps < 5 && at.dice !== null && turn(at) === side && !result(at); steps += 1) {
    const played = play(at, robot.move(at, side, {}, random), side);
    if (played.error) throw new Error(played.error);
    at = played.state;
  }
  return at;
}

describe("the Backgammon robot", () => {
  it("says which of its steps the user does not see: the rolls, not the checkers it moves", () => {
    const { moves } = playOut(game, [timed(seeded(4)), timed(seeded(5))]);
    const steps = unseenSteps(game, moves);
    expect(steps.some(({ unseen }) => unseen)).toBe(true);
    for (const { move, unseen } of steps) expect(unseen, move).toBe(/^[csr]/.test(move));
  });

  it("commits to a seed for its own roll, keeps it, and reveals it once the other seed is in", () => {
    const memory = {};
    const commit = robot.move(initial(), 0, memory, seeded(1));
    expect(commit).toMatch(/^c[A-Za-z0-9_-]{43}$/);
    expect(memory).toEqual({ seed: expect.any(String) });
    expect(commitText(fromBase64url(memory.seed))).toBe(commit);
    let state = play(initial(), commit, 0).state;
    state = play(state, seedText(new Uint8Array(SEED_BYTES).fill(7)), 1).state;
    const reveal = robot.move(state, 0, memory, seeded(2));
    expect(reveal).toBe(revealText(fromBase64url(memory.seed)));
    expect(play(state, reveal, 0).state.dice).toHaveLength(2);
  });

  it("gives a fresh seed for the other side's roll, the same whatever that side committed to", () => {
    const one = play(initial(), commitText(new Uint8Array(SEED_BYTES).fill(3)), 0).state;
    const two = play(initial(), commitText(new Uint8Array(SEED_BYTES).fill(4)), 0).state;
    const seed = robot.move(one, 1, {}, seeded(5));
    expect(seed).toMatch(/^s/);
    expect(play(one, seed, 1).error).toBeUndefined();
    expect(robot.move(two, 1, {}, seeded(5))).toBe(seed);
    expect(robot.move(one, 1, {}, seeded(6))).not.toBe(seed);
  });

  it("makes its five-point with an opening three-one", () => {
    const opening = { ...initial(), dice: [3, 1], left: [3, 1], roll: { commit: "x", seed: "y" } };
    const after = wholeTurn(opening, 0);
    expect(after.points[4][0]).toBe(2);
    expect(after.next).toBe(1);
  });

  it("hits a blot it can reach", () => {
    const state = position(
      [
        [10, 0, 2],
        [5, 0, 5],
        [3, 0, 5],
        [1, 0, 3],
        [7, 1, 1],
        [20, 1, 7],
        [22, 1, 7],
      ],
      { dice: [3, 5] },
    );
    expect(wholeTurn(state, 0).bar[1]).toBe(1);
  });

  it("leaves no blot the other side can reach when it can play safe", () => {
    const state = position(
      [
        [9, 0, 2],
        [7, 0, 2],
        [5, 0, 4],
        [4, 0, 4],
        [3, 0, 3],
        [1, 1, 2],
        [20, 1, 13],
      ],
      { dice: [4, 2] },
    );
    for (let seed = 1; seed <= 5; seed += 1) {
      const after = wholeTurn(state, 0, seeded(seed));
      expect(after.points.flatMap((point, at) => (point[0] === 1 && at > 1 ? [at] : []))).toEqual([]);
    }
  });

  it("bears off when it can", () => {
    const state = position(
      [
        [5, 0, 3],
        [4, 0, 4],
        [2, 0, 4],
        [0, 0, 4],
        [20, 1, 15],
      ],
      { dice: [6, 5] },
    );
    expect(wholeTurn(state, 0).off[0]).toBe(2);
  });

  it("passes when the dice give it nothing to play", () => {
    const state = position(
      [
        [18, 1, 2],
        [19, 1, 2],
        [20, 1, 2],
        [21, 1, 2],
        [22, 1, 2],
        [23, 1, 2],
        [5, 0, 14],
        [3, 1, 3],
      ],
      { bar: [1, 0], dice: [4, 2] },
    );
    expect(legalMoves(state)).toEqual([]);
    expect(robot.move(state, 0, {}, seeded(1))).toBe("x");
  });

  it("plays a whole match against itself, every move legal and every roll checking out", () => {
    const random = seeded(3);
    const { moves, result: ended } = playOut(game, [timed(random), timed(random)], { limit: 3000 });
    expect(replay({ a: "a", b: "b", first: "a", moves }, game).ok).toBe(true);
    expect(ended.reason).not.toBe("cheat");
  });

  it("beats a player who makes any legal move, whoever starts, and answers within a moment", () => {
    let won = 0;
    const clock = { worst: 0 };
    for (let seed = 1; seed <= 10; seed += 1) {
      const random = seeded(seed);
      const robotSide = seed % 2;
      const players = robotSide === 0 ? [timed(random, {}, clock), person(random)] : [person(random), timed(random, {}, clock)];
      const { result: ended } = playOut(game, players, { limit: 3000 });
      expect(ended.reason).not.toBe("cheat");
      if (ended.winner === robotSide) won += 1;
    }
    expect(won).toBeGreaterThanOrEqual(9);
    expect(clock.worst).toBeLessThan(250);
  });

  it("gives no move once the round is over", () => {
    const random = seeded(8);
    const { state } = playOut(game, [timed(random), timed(random)], { limit: 3000 });
    expect(robot.move(state, 0, {}, random)).toBeNull();
  });
});

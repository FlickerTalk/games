import { describe, expect, it } from "vitest";
import { replay } from "../../../kit/src/match.js";
import { robotMove } from "../../../kit/src/robot.js";
import { playOut, seeded } from "../../../kit/test/helpers.js";
import { robot } from "../src/robot.js";
import { fromBase64url } from "../src/sha256.js";
import {
  CELLS,
  DEFAULT_FLEET,
  SALT_BYTES,
  SHIPS,
  SIZE,
  commitText,
  fleetCommit,
  honestAnswer,
  initial,
  parseFleet,
  play,
  randomFleet,
  result,
  revealText,
  turn,
} from "../src/rules.js";

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
  const salt = Uint8Array.from({ length: SALT_BYTES }, () => Math.floor(random() * 256));
  let ships = null;
  return (state, side) => {
    if (state.phase === "place") {
      ships = randomFleet(random);
      return commitText(salt, ships);
    }
    if (state.phase === "reveal") return revealText(salt, ships);
    const answer = honestAnswer(state, side, ships);
    if (answer.startsWith("s") && state.sunk[side].length + 1 === SHIPS.length) return answer;
    const open = [...Array(CELLS).keys()].filter((cell) => !state.shots[side].includes(cell));
    return `${answer}>${open[Math.floor(random() * open.length)]}`;
  };
}

const step = (state, move) => {
  const played = play(state, move, turn(state));
  if (played.error) throw new Error(`${move}: ${played.error}`);
  return played.state;
};

function firing(memory, theirs = DEFAULT_FLEET, salt = new Uint8Array(SALT_BYTES).fill(9)) {
  let state = step(initial(), robot.move(initial(), 0, memory, seeded(1)));
  state = step(state, commitText(salt, theirs));
  return state;
}

function exchange(state, memory, shot, reply, theirs = DEFAULT_FLEET) {
  const next = step(state, `${honestAnswer(state, 0, parseFleet(memory.fleet))}>${shot}`);
  return step(next, `${honestAnswer(next, 1, theirs)}>${reply}`);
}

const target = (move) => Number(move.split(">")[1]);
const near = (cell) => {
  const row = Math.floor(cell / SIZE);
  const col = cell % SIZE;
  return [
    [row - 1, col],
    [row + 1, col],
    [row, col - 1],
    [row, col + 1],
  ]
    .filter(([r, c]) => r >= 0 && r < SIZE && c >= 0 && c < SIZE)
    .map(([r, c]) => r * SIZE + c);
};

describe("the Sea Battle robot", () => {
  it("places a legal fleet at random and commits to it, keeping the fleet and its salt in its memory", () => {
    const memory = {};
    const move = robot.move(initial(), 0, memory, seeded(4));
    expect(move).toMatch(/^c[A-Za-z0-9_-]{43}$/);
    const ships = parseFleet(memory.fleet);
    const salt = fromBase64url(memory.salt);
    expect(ships).not.toBeNull();
    expect(salt).toHaveLength(SALT_BYTES);
    expect(fleetCommit(salt, ships)).toBe(move.slice(1));
    expect(JSON.parse(JSON.stringify(memory))).toEqual(memory);
    expect(JSON.stringify(memory).length).toBeLessThan(100);
    const other = {};
    robot.move(initial(), 0, other, seeded(5));
    expect(other.fleet).not.toBe(memory.fleet);
    expect(other.salt).not.toBe(memory.salt);
  });

  it("fires next to a hit that has not sunk a ship yet", () => {
    for (let seed = 1; seed <= 8; seed += 1) {
      const memory = {};
      const state = exchange(firing(memory), memory, 37, 0);
      expect(state.answers[1]).toEqual(["h"]);
      expect(near(37)).toContain(target(robot.move(state, 0, memory, seeded(seed))));
    }
  });

  it("follows a line of hits to its ends", () => {
    for (let seed = 1; seed <= 8; seed += 1) {
      const memory = {};
      let state = exchange(firing(memory), memory, 37, 0);
      state = exchange(state, memory, 38, 1);
      expect(state.answers[1]).toEqual(["h", "h"]);
      expect([36, 39]).toContain(target(robot.move(state, 0, memory, seeded(seed))));
    }
  });

  it("goes back to a parity pattern once the ship it was after is sunk", () => {
    for (let seed = 1; seed <= 8; seed += 1) {
      const memory = {};
      let state = exchange(firing(memory), memory, 36, 0);
      state = exchange(state, memory, 37, 1);
      state = exchange(state, memory, 38, 2);
      expect(state.sunk[1]).toHaveLength(1);
      const cell = target(robot.move(state, 0, memory, seeded(seed)));
      expect((Math.floor(cell / SIZE) + (cell % SIZE)) % 2).toBe(0);
      expect([36, 37, 38]).not.toContain(cell);
    }
  });

  it("hunts on the parity pattern before it has hit anything", () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const memory = {};
      const cell = target(robot.move(firing(memory), 0, memory, seeded(seed)));
      expect((Math.floor(cell / SIZE) + (cell % SIZE)) % 2).toBe(0);
    }
  });

  it("answers the shot it was given truthfully, by the fleet it committed to", () => {
    const memory = {};
    const state = exchange(firing(memory), memory, 0, 55);
    const move = robot.move(state, 0, memory, seeded(2));
    expect(move.split(">")[0]).toBe(honestAnswer(state, 0, parseFleet(memory.fleet)));
  });

  it("chooses the same shot whatever the other fleet is, when what has been said is the same", () => {
    const memory = {};
    const elsewhere = [
      { start: 60, o: "h", len: 5 },
      { start: 70, o: "h", len: 4 },
      { start: 80, o: "h", len: 3 },
      { start: 90, o: "h", len: 3 },
      { start: 66, o: "h", len: 2 },
    ];
    const one = exchange(firing(memory, DEFAULT_FLEET), memory, 0, 1);
    const two = exchange(firing(memory, elsewhere, new Uint8Array(SALT_BYTES).fill(3)), memory, 0, 1, elsewhere);
    expect(two.commits[1]).not.toBe(one.commits[1]);
    expect({ ...two, commits: null }).toEqual({ ...one, commits: null });
    for (let seed = 1; seed <= 5; seed += 1) {
      expect(robot.move(two, 0, { ...memory }, seeded(seed))).toBe(robot.move(one, 0, { ...memory }, seeded(seed)));
    }
  });

  it("plays a whole round against itself, every move legal, and both fleets check out at the end", () => {
    const random = seeded(3);
    const { moves, state, result: ended } = playOut(game, [timed(random), timed(random)]);
    expect(replay({ a: "a", b: "b", first: "a", moves }, game).ok).toBe(true);
    expect(ended.reason).toBe("sunk");
    expect(state.reveals.map((reveal) => reveal.ok)).toEqual([true, true]);
  });

  it("beats a player who fires at random, whoever starts, and its fleet always checks out", () => {
    let won = 0;
    const clock = { worst: 0 };
    for (let seed = 1; seed <= 10; seed += 1) {
      const random = seeded(seed);
      const robotSide = seed % 2;
      const players = robotSide === 0 ? [timed(random, {}, clock), person(random)] : [person(random), timed(random, {}, clock)];
      const { state, result: ended } = playOut(game, players);
      expect(state.reveals[robotSide].ok).toBe(true);
      if (ended.winner === robotSide) won += 1;
    }
    expect(won).toBeGreaterThanOrEqual(9);
    expect(clock.worst).toBeLessThan(100);
  });

  it("commits to a new fleet for a new round, as the second to place it too", () => {
    const memory = {};
    const random = seeded(6);
    robot.move(initial(), 0, memory, random);
    const first = memory.fleet;
    const placing = step(initial(), commitText(new Uint8Array(SALT_BYTES).fill(1), DEFAULT_FLEET));
    const move = robot.move(placing, 1, memory, random);
    expect(play(placing, move, 1).state.phase).toBe("fire");
    expect(memory.fleet).not.toBe(first);
    expect(fleetCommit(fromBase64url(memory.salt), parseFleet(memory.fleet))).toBe(move.slice(1));
  });

  it("gives no move once the round is over", () => {
    const random = seeded(8);
    const memory = {};
    const { state } = playOut(game, [timed(random, memory), timed(random)]);
    expect(robot.move(state, 0, memory, random)).toBeNull();
  });
});

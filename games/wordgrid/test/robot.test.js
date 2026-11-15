import { describe, expect, it } from "vitest";
import { replay } from "../../../kit/src/match.js";
import { robotMove } from "../../../kit/src/robot.js";
import { playOut, seeded, unseenSteps } from "../../../kit/test/helpers.js";
import { SHARE, robot } from "../src/robot.js";
import { fromBase64url } from "../src/sha256.js";
import { SEED_BYTES, commitText, initial, play, result, revealText, seedText, turn, wordsOn } from "../src/rules.js";

const game = { initial, play, result, turn, robot };
const bytes = (random) => Uint8Array.from({ length: SEED_BYTES }, () => Math.floor(random() * 256));

function timed(random, { memory = {}, clock = { worst: 0 }, lang = "en" } = {}) {
  return (state, side) => {
    const started = performance.now();
    const move = robotMove(game, state, side, memory, random, { lang });
    clock.worst = Math.max(clock.worst, performance.now() - started);
    return move;
  };
}

function reader(random, share) {
  let seed = null;
  let known = null;
  return (state) => {
    if (state.phase === "shuffle") {
      if (state.commit === null) {
        seed = bytes(random);
        return commitText("en", seed);
      }
      return state.seedB === null ? seedText(bytes(random)) : revealText(seed);
    }
    known ??= wordsOn(state.grid, state.lang).filter(() => random() < share);
    const open = known.filter((word) => !state.said[0].includes(word) && !state.said[1].includes(word));
    return open.length ? `w${open[Math.floor(random() * open.length)]}` : "x";
  };
}

const step = (state, move) => {
  const played = play(state, move, turn(state));
  if (played.error) throw new Error(`${move}: ${played.error}`);
  return played.state;
};

function drawn(random, robotSide = 1) {
  const theirs = bytes(random);
  let state = robotSide === 1 ? step(initial(), commitText("en", theirs)) : initial();
  const memory = {};
  if (robotSide === 0) state = step(state, robot.move(state, 0, memory, random, { lang: "en" }));
  state = step(state, robotSide === 1 ? robot.move(state, 1, memory, random, { lang: "en" }) : seedText(bytes(random)));
  if (robotSide === 1) state = step(state, revealText(theirs));
  else state = step(state, robot.move(state, 0, memory, random, { lang: "en" }));
  return { state, memory };
}

function alone(state, memory, random, side) {
  const said = [];
  let at = state;
  for (let guard = 0; guard < 400 && !result(at); guard += 1) {
    const move = turn(at) === side ? robot.move(at, side, memory, random, { lang: "en" }) : "x";
    if (move.startsWith("w")) said.push(move.slice(1));
    at = step(at, move);
  }
  return { said, state: at };
}

describe("the Letter Grid robot", () => {
  it("says which of its steps the user does not see: the draw of the letters, not the words it says", () => {
    const { moves } = playOut(game, [timed(seeded(4)), timed(seeded(5))]);
    const steps = unseenSteps(game, moves);
    expect(steps.some(({ unseen }) => unseen)).toBe(true);
    for (const { move, unseen } of steps) expect(unseen, move).toBe(/^[csr]/.test(move));
  });

  it("commits to a seed of its own in the user's language, keeps it, and reveals it once the other seed is in", () => {
    for (const lang of ["en", "es"]) {
      const memory = {};
      const commit = robot.move(initial(), 0, memory, seeded(1), { lang });
      expect(commit.slice(0, 3)).toBe(`c${lang}`);
      expect(commitText(lang, fromBase64url(memory.seed))).toBe(commit);
      expect(JSON.parse(JSON.stringify(memory))).toEqual(memory);
      let state = step(initial(), commit);
      state = step(state, seedText(new Uint8Array(SEED_BYTES).fill(7)));
      const reveal = robot.move(state, 0, memory, seeded(2), { lang });
      expect(reveal).toBe(revealText(fromBase64url(memory.seed)));
      expect(step(state, reveal).phase).toBe("play");
    }
    expect(robot.move(initial(), 0, {}, seeded(1), { lang: "fr" }).slice(0, 3)).toBe("cen");
  });

  it("answers the other side's commitment with a fresh seed, the same whatever that side committed to", () => {
    const one = step(initial(), commitText("en", new Uint8Array(SEED_BYTES).fill(3)));
    const two = step(initial(), commitText("en", new Uint8Array(SEED_BYTES).fill(4)));
    const seed = robot.move(one, 1, {}, seeded(5), { lang: "en" });
    expect(seed).toMatch(/^s/);
    expect(robot.move(two, 1, {}, seeded(5), { lang: "en" })).toBe(seed);
    expect(robot.move(one, 1, {}, seeded(6), { lang: "en" })).not.toBe(seed);
  });

  it("says only words of the grid it has not heard yet, about a share of them, then passes", () => {
    let found = 0;
    let all = 0;
    for (let seed = 1; seed <= 40; seed += 1) {
      const random = seeded(seed);
      const { state, memory } = drawn(random);
      const { said, state: ended } = alone(state, memory, random, 1);
      const words = wordsOn(state.grid, "en");
      for (const word of said) expect(words).toContain(word);
      expect(new Set(said).size).toBe(said.length);
      expect(ended.end.reason).toBe("passed");
      found += said.length;
      all += words.length;
    }
    expect(found / all).toBeGreaterThan(SHARE * 0.7);
    expect(found / all).toBeLessThan(SHARE * 1.3);
  });

  it("knows the same words when the match is closed and opened again", () => {
    const random = seeded(9);
    const { state, memory } = drawn(random);
    const once = alone(state, structuredClone(memory), seeded(1), 1).said;
    const again = alone(state, JSON.parse(JSON.stringify(memory)), seeded(2), 1).said;
    expect(new Set(again)).toEqual(new Set(once));
    expect(once.length).toBeGreaterThan(0);
  });

  it("leaves a word to the user who says it first", () => {
    const random = seeded(12);
    const { state, memory } = drawn(random);
    const known = alone(state, structuredClone(memory), random, 1).said;
    expect(known.length).toBeGreaterThan(1);
    const taken = step(state, robot.move(state, 1, memory, random, { lang: "en" }));
    const theirs = known.find((word) => !taken.said[1].includes(word));
    const after = alone(step(taken, `w${theirs}`), memory, random, 1);
    expect(after.said).not.toContain(theirs);
    expect(after.said.length).toBe(known.length - 2);
  });

  it("plays a whole round against itself, every move legal, and the draw checking out", () => {
    const random = seeded(3);
    const { moves, result: ended } = playOut(game, [timed(random, { memory: {} }), timed(random, { memory: {} })]);
    expect(replay({ a: "a", b: "b", first: "a", moves }, game).ok).toBe(true);
    expect(ended.reason).toBe("passed");
  });

  it("plays a whole round against a player who says any word of the grid, and the draw checks out whoever starts", () => {
    const clock = { worst: 0 };
    for (let seed = 1; seed <= 6; seed += 1) {
      const random = seeded(seed);
      const robotSide = seed % 2;
      const players = robotSide === 0 ? [timed(random, { clock }), reader(random, 1)] : [reader(random, 1), timed(random, { clock })];
      expect(playOut(game, players).result.reason).toBe("passed");
    }
    expect(clock.worst).toBeLessThan(250);
  });

  it("can be beaten by a player who finds more words than it does, and beats one who finds fewer", () => {
    const wins = (share) => {
      let won = 0;
      for (let seed = 1; seed <= 20; seed += 1) {
        const random = seeded(seed);
        const robotSide = seed % 2;
        const players = robotSide === 0 ? [timed(random), reader(random, share)] : [reader(random, share), timed(random)];
        if (playOut(game, players).result.winner === robotSide) won += 1;
      }
      return won;
    };
    expect(wins(SHARE * 2)).toBeLessThanOrEqual(6);
    expect(wins(SHARE / 2)).toBeGreaterThanOrEqual(14);
  });

  it("gives no move once the round is over", () => {
    const random = seeded(8);
    const memory = {};
    const { state } = playOut(game, [timed(random, { memory }), timed(random)]);
    expect(robot.move(state, 0, memory, random, { lang: "en" })).toBeNull();
  });
});

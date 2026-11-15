import { describe, expect, it } from "vitest";
import { replay } from "../../../kit/src/match.js";
import { robotMove } from "../../../kit/src/robot.js";
import { playOut, seeded } from "../../../kit/test/helpers.js";
import { robot } from "../src/robot.js";
import { fromBase64url } from "../src/sha256.js";
import { SALT_BYTES, commitHash, commitText, commitTextSecond, feedback, honestAnswer, initial, play, result, revealText, solvedAt, turn, words } from "../src/rules.js";

const game = { initial, play, result, turn, robot };

function timed(random, { memory = {}, clock = { worst: 0 }, lang = "en" } = {}) {
  return (state, side) => {
    const started = performance.now();
    const move = robotMove(game, state, side, memory, random, { lang });
    clock.worst = Math.max(clock.worst, performance.now() - started);
    return move;
  };
}

function person(random, word = null) {
  const salt = Uint8Array.from({ length: SALT_BYTES }, () => Math.floor(random() * 256));
  const all = [...words("en").accepted];
  let secret = word;
  return (state, side) => {
    if (state.phase === "place") {
      secret ??= words(state.lang ?? "en").answers[Math.floor(random() * 1000)];
      return side === 0 ? commitText("en", salt, secret) : commitTextSecond(salt, secret);
    }
    if (state.phase === "reveal") return revealText(salt, secret);
    const answer = honestAnswer(state, side, secret);
    if (answer && !play(state, answer, side).error) return answer;
    return `${answer}>${all[Math.floor(random() * all.length)]}`;
  };
}

const step = (state, move) => {
  const played = play(state, move, turn(state));
  if (played.error) throw new Error(`${move}: ${played.error}`);
  return played.state;
};

const fits = (state, side, guess) => state.guesses[side].every((one, at) => state.answers[1 - side][at] === undefined || feedback(one, guess) === state.answers[1 - side][at]);

function guessing(memory, theirs = "crane", salt = new Uint8Array(SALT_BYTES).fill(4)) {
  const placed = step(initial(), robot.move(initial(), 0, memory, seeded(1), { lang: "en" }));
  return step(placed, commitTextSecond(salt, theirs));
}

describe("the Word Duel robot", () => {
  it("picks a secret word in the user's language when it commits first, and keeps it with its salt", () => {
    for (const lang of ["en", "es"]) {
      const memory = {};
      const move = robot.move(initial(), 0, memory, seeded(2), { lang });
      expect(move.slice(0, 3)).toBe(`c${lang}`);
      expect(words(lang).answers).toContain(memory.word);
      expect(fromBase64url(memory.salt)).toHaveLength(SALT_BYTES);
      expect(commitHash(fromBase64url(memory.salt), memory.word)).toBe(move.slice(3));
      expect(JSON.parse(JSON.stringify(memory))).toEqual(memory);
    }
    expect(robot.move(initial(), 0, {}, seeded(2), { lang: "es-MX" }).slice(0, 3)).toBe("ces");
    expect(robot.move(initial(), 0, {}, seeded(2), { lang: "fr" }).slice(0, 3)).toBe("cen");
    expect(robot.move(initial(), 0, {}, seeded(2)).slice(0, 3)).toBe("cen");
  });

  it("picks its word in the round's language when it commits second", () => {
    const placed = step(initial(), commitText("es", new Uint8Array(SALT_BYTES).fill(1), "perro"));
    const memory = {};
    const move = robot.move(placed, 1, memory, seeded(3), { lang: "en" });
    expect(words("es").answers).toContain(memory.word);
    expect(step(placed, move).phase).toBe("guess");
  });

  it("guesses only words that fit every answer it has had, and finds the word", () => {
    let solved = 0;
    for (let seed = 1; seed <= 20; seed += 1) {
      const random = seeded(seed);
      const theirs = words("en").answers[seed * 37];
      const memory = {};
      let state = guessing(memory, theirs);
      for (let round = 0; round < 6 && state.phase === "guess"; round += 1) {
        const move = robot.move(state, 0, memory, random, { lang: "en" });
        const guess = move.split(">")[1];
        if (guess) expect(fits(state, 0, guess)).toBe(true);
        state = step(state, move);
        if (state.phase !== "guess") break;
        state = step(state, `${honestAnswer(state, 1, theirs)}>${memory.word === "about" ? "other" : "about"}`);
      }
      if (solvedAt(state, 0) !== null) solved += 1;
    }
    expect(solved).toBeGreaterThanOrEqual(17);
  });

  it("answers the other side's guess truthfully, and alone once the round is decided", () => {
    const memory = {};
    let state = guessing(memory);
    state = step(state, robot.move(state, 0, memory, seeded(1), { lang: "en" }));
    state = step(state, `${honestAnswer(state, 1, "crane")}>${memory.word}`);
    const move = robot.move(state, 0, memory, seeded(1), { lang: "en" });
    expect(move).toBe("ggggg");
    expect(step(state, move).phase).toBe("reveal");
    const reveal = robot.move(step(state, move), 0, memory, seeded(1), { lang: "en" });
    expect(reveal).toBe(revealText(fromBase64url(memory.salt), memory.word));
  });

  it("guesses the same whatever the other word is, when the answers so far are the same", () => {
    const memory = {};
    const one = guessing(memory, "crane", new Uint8Array(SALT_BYTES).fill(4));
    const two = guessing(memory, "eagle", new Uint8Array(SALT_BYTES).fill(5));
    expect(two.commits[1]).not.toBe(one.commits[1]);
    for (let seed = 1; seed <= 5; seed += 1) {
      expect(robot.move(two, 0, { ...memory }, seeded(seed), { lang: "en" })).toBe(robot.move(one, 0, { ...memory }, seeded(seed), { lang: "en" }));
    }
  });

  it("still guesses a word when the answers it was given fit none", () => {
    const memory = {};
    let state = guessing(memory);
    state = step(state, ">about");
    state = step(state, "bbbbb>other");
    state = step(state, `${honestAnswer(state, 0, memory.word)}>abort`);
    state = step(state, "ggggb>cards");
    const move = robot.move(state, 0, memory, seeded(1), { lang: "en" });
    expect(step(state, move).guesses[0]).toHaveLength(3);
  });

  it("plays a whole round against itself, every move legal, and both words check out", () => {
    const random = seeded(3);
    const { moves, state, result: ended } = playOut(game, [timed(random), timed(random)]);
    expect(replay({ a: "a", b: "b", first: "a", moves }, game).ok).toBe(true);
    expect(state.reveals.map((reveal) => reveal.ok)).toEqual([true, true]);
    expect(ended.reason).not.toMatch(/cheat|both/);
  });

  it("beats a player who guesses any word in the list, whoever starts, and answers within a moment", () => {
    let won = 0;
    const clock = { worst: 0 };
    for (let seed = 1; seed <= 10; seed += 1) {
      const random = seeded(seed);
      const robotSide = seed % 2;
      const players = robotSide === 0 ? [timed(random, { clock }), person(random)] : [person(random), timed(random, { clock })];
      const { state, result: ended } = playOut(game, players);
      expect(state.reveals[robotSide].ok).toBe(true);
      if (ended.winner === robotSide) won += 1;
    }
    expect(won).toBeGreaterThanOrEqual(9);
    expect(clock.worst).toBeLessThan(250);
  });

  it("gives no move once the round is over", () => {
    const random = seeded(8);
    const memory = {};
    const { state } = playOut(game, [timed(random, { memory }), timed(random)]);
    expect(robot.move(state, 0, memory, random, { lang: "en" })).toBeNull();
  });
});

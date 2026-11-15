import { describe, expect, it } from "vitest";
import { replay } from "../../../kit/src/match.js";
import { robotMove } from "../../../kit/src/robot.js";
import { playOut, seeded, unseenSteps } from "../../../kit/test/helpers.js";
import { robot } from "../src/robot.js";
import { fromBase64url } from "../src/sha256.js";
import { SEED_BYTES, SUITS, commitText, initial, isEight, play, playable, result, revealText, seedText, suitOf, turn } from "../src/rules.js";

const game = { initial, play, result, turn, robot };
const card = (rank, suit) => SUITS.indexOf(suit) * 13 + rank;

function timed(random, memory = {}, clock = { worst: 0 }) {
  return (state, side) => {
    const started = performance.now();
    const move = robotMove(game, state, side, memory, random);
    clock.worst = Math.max(clock.worst, performance.now() - started);
    return move;
  };
}

function person(random) {
  const seed = Uint8Array.from({ length: SEED_BYTES }, () => Math.floor(random() * 256));
  return (state, side) => {
    if (state.phase === "shuffle") return state.commit === null ? commitText(seed) : state.seedB === null ? seedText(seed) : revealText(seed);
    const cards = state.hands[side].filter((one) => playable(state, one));
    const choices = [...cards.map((one) => `p${one}${isEight(one) ? SUITS[Math.floor(random() * 4)] : ""}`), state.stock.length ? "d" : "x"];
    return choices[Math.floor(random() * choices.length)];
  };
}

function table({ mine, theirs = [card(1, "c"), card(2, "c")], top, suit = suitOf(top), stock = [card(12, "h"), card(11, "h")] }) {
  return { ...initial(), phase: "play", commit: "x", seedB: "y", hands: [mine, theirs], pile: [top], stock, suit, next: 0, passes: 0 };
}

const legal = (state, move) => !play(state, move, 0).error;

describe("the Crazy Eights robot", () => {
  it("says which of its steps the user does not see: the shuffle, not the cards it plays or draws", () => {
    const { moves } = playOut(game, [timed(seeded(4)), timed(seeded(5))]);
    const steps = unseenSteps(game, moves);
    expect(steps.some(({ unseen }) => unseen)).toBe(true);
    for (const { move, unseen } of steps) expect(unseen, move).toBe(/^[csr]/.test(move));
  });

  it("commits to a seed of its own as the dealer, keeps it, and reveals it once the other seed is in", () => {
    const memory = {};
    const commit = robot.move(initial(), 0, memory, seeded(1));
    expect(commit).toMatch(/^c[A-Za-z0-9_-]{43}$/);
    expect(memory).toEqual({ seed: expect.any(String) });
    expect(JSON.parse(JSON.stringify(memory))).toEqual(memory);
    expect(commitText(fromBase64url(memory.seed))).toBe(commit);
    let state = play(initial(), commit, 0).state;
    state = play(state, seedText(new Uint8Array(SEED_BYTES).fill(7)), 1).state;
    const reveal = robot.move(state, 0, memory, seeded(2));
    expect(reveal).toBe(revealText(fromBase64url(memory.seed)));
    expect(play(state, reveal, 0).state.phase).toBe("play");
  });

  it("answers the dealer's commitment with a fresh seed", () => {
    const state = play(initial(), commitText(new Uint8Array(SEED_BYTES).fill(3)), 0).state;
    const one = robot.move(state, 1, {}, seeded(1));
    const two = robot.move(state, 1, {}, seeded(2));
    expect(one).toMatch(/^s/);
    expect(play(state, one, 1).error).toBeUndefined();
    expect(two).not.toBe(one);
  });

  it("plays a card that goes, and keeps its eights while it has another card to play", () => {
    const state = table({ mine: [card(7, "s"), card(3, "h"), card(9, "c")], top: card(3, "d") });
    for (let seed = 1; seed <= 5; seed += 1) {
      const move = robot.move(state, 0, {}, seeded(seed));
      expect(move).toBe(`p${card(3, "h")}`);
      expect(legal(state, move)).toBe(true);
    }
  });

  it("sheds the suit it holds most of", () => {
    const state = table({ mine: [card(4, "h"), card(4, "c"), card(10, "c"), card(12, "c"), card(1, "h")], top: card(4, "s") });
    for (let seed = 1; seed <= 5; seed += 1) expect(robot.move(state, 0, {}, seeded(seed))).toBe(`p${card(4, "c")}`);
    const bySuit = table({ mine: [card(2, "d"), card(9, "d"), card(5, "s"), card(6, "s"), card(11, "s")], top: card(3, "s"), suit: SUITS.indexOf("s") });
    for (let seed = 1; seed <= 5; seed += 1) expect([`p${card(5, "s")}`, `p${card(6, "s")}`, `p${card(11, "s")}`]).toContain(robot.move(bySuit, 0, {}, seeded(seed)));
  });

  it("plays an eight when nothing else goes, and names the suit it holds most of", () => {
    const state = table({ mine: [card(7, "s"), card(2, "d"), card(9, "d"), card(5, "c")], top: card(3, "h") });
    const move = robot.move(state, 0, {}, seeded(1));
    expect(move).toBe(`p${card(7, "s")}d`);
    expect(legal(state, move)).toBe(true);
  });

  it("draws when no card goes, and passes once the stock is gone too", () => {
    const stuck = table({ mine: [card(2, "d"), card(9, "c")], top: card(3, "h") });
    expect(robot.move(stuck, 0, {}, seeded(1))).toBe("d");
    const empty = table({ mine: [card(2, "d"), card(9, "c")], top: card(3, "h"), stock: [] });
    expect(robot.move(empty, 0, {}, seeded(1))).toBe("x");
    expect(legal(empty, "x")).toBe(true);
  });

  it("plays the same whatever the other hand and the order of the stock, when its own hand and the pile are the same", () => {
    const mine = [card(4, "h"), card(4, "c"), card(10, "c"), card(7, "d"), card(1, "h")];
    const one = table({ mine, top: card(4, "s"), theirs: [card(2, "s"), card(3, "s")], stock: [card(5, "h"), card(6, "h"), card(8, "h")] });
    const two = table({ mine, top: card(4, "s"), theirs: [card(5, "h"), card(8, "h")], stock: [card(3, "s"), card(6, "h"), card(2, "s")] });
    for (let seed = 1; seed <= 10; seed += 1) expect(robot.move(two, 0, {}, seeded(seed))).toBe(robot.move(one, 0, {}, seeded(seed)));
  });

  it("plays a whole round against itself, every move legal, the deal checking out", () => {
    const random = seeded(3);
    const { moves, result: ended } = playOut(game, [timed(random), timed(random)]);
    expect(replay({ a: "a", b: "b", first: "a", moves }, game).ok).toBe(true);
    expect(["out", "stuck"]).toContain(ended.reason);
  });

  it("wins most rounds against a player who plays any card that goes, whoever deals", () => {
    let won = 0;
    const clock = { worst: 0 };
    for (let seed = 1; seed <= 40; seed += 1) {
      const random = seeded(seed);
      const robotSide = seed % 2;
      const players = robotSide === 0 ? [timed(random, {}, clock), person(random)] : [person(random), timed(random, {}, clock)];
      const { result: ended } = playOut(game, players);
      expect(ended.reason).not.toBe("cheat");
      if (ended.winner === robotSide) won += 1;
    }
    expect(won).toBeGreaterThanOrEqual(24);
    expect(clock.worst).toBeLessThan(50);
  });

  it("gives no move once the round is over", () => {
    const random = seeded(8);
    const { state } = playOut(game, [timed(random), timed(random)]);
    expect(robot.move(state, turn(state), {}, random)).toBeNull();
  });
});

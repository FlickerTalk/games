// The rules of Backgammon as the kit asks for them: the dice rolled from two seeds by commit and
// reveal before each turn, checkers moved by the dice one at a time (both dice when possible, the
// higher when only one can be), the bar, bearing off, and how a round ends.
import { describe, expect, it } from "vitest";
import { PLAYS } from "../../../preview/shots.js";
import { CHECKERS, POINTS, canBearOff, commitText, inHome, initial, legalMoves, moveText, moved, pips, play, result, revealText, rollDice, seedText, singleMoves, turn } from "../src/rules.js";

const A = Uint8Array.from({ length: 24 }, (_, at) => at + 1);
const B = new Uint8Array(24).fill(0x5a);
const ROLL = [commitText(A), seedText(B), revealText(A)];

function after(moves, from = initial()) {
  let state = from;
  for (const move of moves) {
    const played = play(state, move, turn(state));
    if (played.error) throw new Error(`${move}: ${played.error}`);
    state = played.state;
  }
  return state;
}

/** A position set by hand: `[point, side, count]`, plus the bar and the borne-off counts. */
function position(places, { bar = [0, 0], off = [0, 0], next = 0, dice = null } = {}) {
  const state = initial();
  state.points = Array.from({ length: POINTS }, () => [0, 0]);
  for (const [point, side, count] of places) state.points[point][side] = count;
  state.bar = bar;
  state.off = off;
  state.next = next;
  if (dice) {
    state.dice = dice;
    state.left = dice[0] === dice[1] ? [dice[0], dice[0], dice[0], dice[0]] : [...dice];
  }
  return state;
}

describe("the start", () => {
  it("places fifteen checkers each as the game is set up, side 0 to roll", () => {
    const state = initial();
    const count = (side) => state.points.reduce((sum, point) => sum + point[side], 0);
    expect(count(0)).toBe(CHECKERS);
    expect(count(1)).toBe(CHECKERS);
    expect(state.points[23]).toEqual([2, 0]);
    expect(state.points[0]).toEqual([0, 2]);
    expect(state.points[12]).toEqual([5, 0]);
    expect(state.points[11]).toEqual([0, 5]);
    expect(turn(state)).toBe(0);
    expect(pips(state, 0)).toBe(167);
    expect(pips(state, 1)).toBe(167);
    expect(inHome(0, 3)).toBe(true);
    expect(inHome(0, 6)).toBe(false);
    expect(inHome(1, 20)).toBe(true);
  });
});

describe("the dice", () => {
  it("are rolled by commitment, seed and reveal, the side to move first and last", () => {
    expect(turn(initial())).toBe(0);
    const committed = after([ROLL[0]]);
    expect(turn(committed)).toBe(1, "the other side seeds");
    const seeded = after(ROLL.slice(0, 2));
    expect(turn(seeded)).toBe(0);
    const rolled = after(ROLL);
    expect(rolled.dice).toEqual(rollDice(A, B, 0));
    expect(rolled.dice).toHaveLength(2);
    for (const die of rolled.dice) expect(die).toBeGreaterThanOrEqual(1);
    expect(rolled.rolls).toBe(1);
    expect(turn(rolled)).toBe(0);
    expect(rolled.left).toHaveLength(rolled.dice[0] === rolled.dice[1] ? 4 : 2);
  });

  it("follow from both seeds and the number of the roll, without bias", () => {
    expect(rollDice(A, B, 0)).toEqual(rollDice(A, B, 0));
    expect(rollDice(A, B, 0)).not.toEqual(rollDice(A, B, 1));
    expect(rollDice(B, A, 0)).not.toEqual(rollDice(A, B, 0));
    const counts = Array(7).fill(0);
    for (let n = 0; n < 600; n += 1) for (const die of rollDice(A, B, n)) counts[die] += 1;
    expect(counts[0]).toBe(0);
    for (let face = 1; face <= 6; face += 1) expect(counts[face]).toBeGreaterThan(120);
  });

  it("refuse what is not their move, and give the round away when the reveal does not match", () => {
    expect(play(initial(), "m23-20", 0)).toEqual({ error: "bad" });
    expect(play(initial(), ROLL[0], 1)).toEqual({ error: "turn" });
    expect(play(after([ROLL[0]]), "sshort", 1)).toEqual({ error: "bad" });
    const cheated = after([revealText(B)], after(ROLL.slice(0, 2)));
    expect(result(cheated)).toEqual({ winner: 1, reason: "cheat" });
  });
});

describe("a move", () => {
  it("takes a checker as far as a die says, onto an open point, and the turn passes when the dice are used", () => {
    const state = position([[23, 0, 2], [12, 0, 5], [7, 0, 3], [5, 0, 5], [0, 1, 2], [11, 1, 5], [16, 1, 3], [18, 1, 5]], { dice: [3, 1] });
    const moves = legalMoves(state);
    expect(moves).toContainEqual({ from: 23, to: 20, die: 3 });
    expect(moves).toContainEqual({ from: 7, to: 4, die: 3 });
    expect(moves).not.toContainEqual({ from: 23, to: 18, die: 5 });
    expect(moves.some((move) => move.from === 12 && move.to === 11)).toBe(false, "five checkers of the other side hold the point");
    const one = after(["m23-20"], state);
    expect(one.points[20]).toEqual([1, 0]);
    expect(one.left).toEqual([1]);
    expect(turn(one)).toBe(0);
    const two = after(["m20-19"], one);
    expect(turn(two)).toBe(1, "both dice used: the other side rolls");
    expect(two.dice).toBeNull();
    expect(play(two, "m5-4", 1)).toEqual({ error: "bad" }, "a roll comes first");
    expect(play(state, "m23-19", 0)).toEqual({ error: "illegal" });
    expect(play(state, "m0-3", 0)).toEqual({ error: "illegal" }, "not this side's checker");
    expect(play(state, "m99-3", 0)).toEqual({ error: "illegal" });
    expect(play(state, "move", 0)).toEqual({ error: "bad" });
    expect(moveText({ from: "b", to: 3 })).toBe("mb-3");
  });

  it("hits a lone checker, which goes to the bar and must come in before anything else", () => {
    const state = position([[23, 0, 2], [20, 1, 1], [5, 0, 13], [11, 1, 14]], { dice: [3, 1] });
    const hit = after(["m23-20"], state);
    expect(hit.points[20]).toEqual([1, 0]);
    expect(hit.bar[1]).toBe(1);
    // Side 1 rolls: it must enter from the bar (into points 0–5 for side 1), and only there.
    const theirs = position([[23, 0, 1], [20, 0, 1], [5, 0, 13], [11, 1, 14]], { bar: [0, 1], next: 1, dice: [4, 2] });
    const moves = legalMoves(theirs);
    expect(moves.every((move) => move.from === "b")).toBe(true);
    expect(moves.map((move) => move.to).sort()).toEqual([1, 3]);
    expect(play(theirs, "m11-13", 1)).toEqual({ error: "illegal" });
    const entered = after(["mb-3"], theirs);
    expect(entered.bar[1]).toBe(0);
    expect(entered.points[3]).toEqual([0, 1]);
    // A point held by two or more cannot be entered: with every entry point blocked, the side passes.
    const blocked = position([[0, 0, 2], [1, 0, 2], [2, 0, 2], [3, 0, 2], [4, 0, 2], [5, 0, 2], [20, 0, 3], [11, 1, 14]], { bar: [0, 1], next: 1, dice: [6, 2] });
    expect(legalMoves(blocked)).toEqual([]);
    expect(play(blocked, "m11-13", 1)).toEqual({ error: "illegal" });
    const passed = after(["x"], blocked);
    expect(turn(passed)).toBe(0);
    expect(play(blocked, "x", 1).error).toBeUndefined();
    expect(play(theirs, "x", 1)).toEqual({ error: "illegal" }, "a pass only with no move");
  });

  it("plays both dice when it can, and the higher when only one can", () => {
    // Side 0: a checker on 23 that can move 2 (to 21) or 5 (to 18) but not both… points 16 and 18 are
    // held by side 1 beyond: from 21 a 5 would reach 16 (held), from 18 a 2 would reach 16 (held).
    const state = position([[23, 0, 1], [16, 1, 2], [0, 1, 13], [1, 0, 14]], { dice: [5, 2] });
    expect(singleMoves(state, 0, 5).length).toBeGreaterThan(0);
    const moves = legalMoves(state);
    // Both dice can be played with the checkers on 1? No: they are home-bound… 1 → off needs bearing off: not all home.
    // With a die of 2 the checker on 23 goes to 21, then 5 more to 16 is blocked; with 5 to 18, then 2 to 16 is blocked:
    // only one die can be played, so it must be the higher.
    expect(moves.every((move) => move.die === 5)).toBe(true);
    expect(moves).toContainEqual({ from: 23, to: 18, die: 5 });
  });

  it("plays four moves on doubles", () => {
    const state = position([[23, 0, 2], [12, 0, 5], [7, 0, 3], [5, 0, 5], [0, 1, 2], [11, 1, 5], [16, 1, 3], [18, 1, 5]], { dice: [2, 2] });
    expect(state.left).toEqual([2, 2, 2, 2]);
    const played = after(["m23-21", "m21-19", "m12-10", "m7-5"], state);
    expect(turn(played)).toBe(1);
    expect(played.dice).toBeNull();
  });
});

describe("bearing off", () => {
  it("begins once every checker is home, exactly by the die or with a higher one from the farthest point", () => {
    const home = position([[5, 0, 2], [2, 0, 3], [0, 0, 10], [18, 1, 15]], { dice: [6, 3] });
    expect(canBearOff(home, 0)).toBe(true);
    const moves = legalMoves(home);
    expect(moves).toContainEqual({ from: 5, to: "o", die: 6 }, "a six bears off from the farthest point, 5, which is six away");
    expect(moves).toContainEqual({ from: 2, to: "o", die: 3 }, "a three bears off from point 2 exactly (three away)");
    expect(moves).not.toContainEqual({ from: 0, to: "o", die: 3 }, "a three may not bear off from point 0 while checkers stand farther");
    const farthest = position([[1, 0, 2], [0, 0, 13], [18, 1, 15]], { dice: [6, 5] });
    expect(legalMoves(farthest)).toContainEqual({ from: 1, to: "o", die: 6 }, "a higher die bears off from the farthest point");
    const notHome = position([[6, 0, 1], [3, 0, 14], [18, 1, 15]], { dice: [4, 4] });
    expect(canBearOff(notHome, 0)).toBe(false);
    expect(legalMoves(notHome).some((move) => move.to === "o")).toBe(false);
    const onBar = position([[3, 0, 14], [18, 1, 15]], { bar: [1, 0], dice: [4, 4] });
    expect(canBearOff(onBar, 0)).toBe(false);
  });

  it("ends the round with the fifteenth checker off: a single win, a gammon, or a backgammon", () => {
    const single = position([[0, 0, 1], [18, 1, 15]], { off: [14, 3], dice: [1, 2] });
    const won = after(["m0-o"], single);
    expect(result(won)).toEqual({ winner: 0, reason: "single" });
    expect(play(won, "x", 1)).toEqual({ error: "over" });
    const gammon = after(["m0-o"], position([[0, 0, 1], [18, 1, 15]], { off: [14, 0], dice: [1, 2] }));
    expect(result(gammon)).toEqual({ winner: 0, reason: "gammon" });
    const backgammon = after(["m0-o"], position([[0, 0, 1], [18, 1, 14], [2, 1, 1]], { off: [14, 0], dice: [1, 2] }));
    expect(result(backgammon)).toEqual({ winner: 0, reason: "backgammon" }, "a checker in the winner's home");
    const onBar = after(["m0-o"], position([[0, 0, 1], [18, 1, 14]], { off: [14, 0], bar: [0, 1], dice: [1, 2] }));
    expect(result(onBar)).toEqual({ winner: 0, reason: "backgammon" });
  });

  it("plays the screenshot line out to a win for the starter", () => {
    const { opening, winning, draw } = PLAYS.backgammon;
    expect(draw).toBeNull();
    expect(result(after(opening))).toBeNull();
    expect(result(after([...opening, ...winning]))).toMatchObject({ winner: 0 });
  });

  it("never changes the state it is given", () => {
    const state = after(ROLL);
    const copy = structuredClone(state);
    const move = legalMoves(state)[0];
    play(state, moveText(move), 0);
    moved(state, 0, move);
    expect(state).toEqual(copy);
  });
});

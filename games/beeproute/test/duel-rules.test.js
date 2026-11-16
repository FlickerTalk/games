import { describe, expect, it } from "vitest";
import { replay } from "../../../kit/src/match.js";
import { DUEL_RULES } from "../src/duel-rules.js";
import { encodeLevel, makeLevel } from "../src/level.js";
import { encodeProgram } from "../src/program.js";

const { initial, turn, play, result } = DUEL_RULES;
const LEVEL = encodeLevel(makeLevel({ size: 5, start: { at: 22, dir: 0 }, rows: ["..G..", ".....", ".....", ".....", "....."] }));
const WALLED = encodeLevel(makeLevel({ size: 5, start: { at: 22, dir: 0 }, rows: ["..G..", "#####", ".....", ".....", "....."] }));
const SOLVES = encodeProgram(["F", "F", "F", "F"]);
const LONGER = encodeProgram(["R", "R", "R", "R", "F", "F", "F", "F"]);

describe("a round with a friend", () => {
  it("is one level made by the round's starter and its solution by the other", () => {
    expect(DUEL_RULES.id).toBe("beeproute");
    expect(DUEL_RULES.gv).toBe(1);
    const fresh = initial();
    expect(turn(fresh)).toBe(0);
    const made = play(fresh, LEVEL, 0);
    expect(made.state).toEqual({ level: LEVEL, program: null });
    expect(turn(made.state)).toBe(1);
    expect(result(made.state)).toBeNull();
    const solved = play(made.state, SOLVES, 1);
    expect(solved.state.program).toBe(SOLVES);
    expect(result(solved.state)).toEqual({ winner: null, count: 4, best: 4 });
    expect(result(play(made.state, LONGER, 1).state)).toEqual({ winner: null, count: 8, best: 4 });
  });

  it("takes a level only if it can be solved, and a program only if it reaches the goal", () => {
    expect(play(initial(), WALLED, 0).error).toBe("unsolvable");
    expect(play(initial(), "Lnonsense", 0).error).toBe("bad");
    expect(play(initial(), SOLVES, 0).error).toBe("bad");
    const made = play(initial(), LEVEL, 0).state;
    expect(play(made, encodeProgram(["F", "F"]), 1).error).toBe("unsolved");
    expect(play(made, LEVEL, 1).error).toBe("bad");
    expect(play(made, SOLVES, 0).error).toBe("turn");
    expect(play(play(made, SOLVES, 1).state, SOLVES, 1).error).toBe("over");
  });

  it("replays through the kit's match from the first move, as both phones do", () => {
    const game = { a: "one", b: "two", first: "one", toss: {}, moves: [LEVEL, SOLVES, { x: "next" }, LEVEL], end: null };
    const played = replay(game, DUEL_RULES);
    expect(played.ok).toBe(true);
    expect(played.actors).toEqual(["one", "two", null, "two"]);
    expect(replay({ ...game, moves: [LEVEL, encodeProgram(["F"])] }, DUEL_RULES).ok).toBe(false);
  });
});

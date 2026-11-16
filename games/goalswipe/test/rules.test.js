import { describe, expect, it } from "vitest";
import { MOVE_LENGTH } from "../../../kit/src/match.js";
import { REACH, snapAim, snapDive } from "../src/kicks.js";
import { RULES, SALT_BYTES, commitMove, diveMove, initial, play, result, revealMove, turn } from "../src/rules.js";

const salt = (seed) => Uint8Array.from({ length: SALT_BYTES }, (_, at) => (seed * 37 + at * 11) & 255);
const CORNER = snapAim({ x: 0.15, y: 0.3 });
const FAR = snapDive({ x: 0.85, y: 0.3 });
const NEAR = snapDive({ x: 0.17, y: 0.32 });
const WIDE = snapAim({ x: 1.2, y: 0.3 });

function kick(state, aim, dive) {
  const index = state.kicks.length;
  const shooter = turn(state);
  let now = play(state, commitMove(index, salt(index), aim), shooter).state;
  now = play(now, diveMove(dive), 1 - shooter).state;
  return play(now, revealMove(salt(index), aim), shooter).state;
}

describe("the shoot-out between two phones", () => {
  it("is a game of the kit: an id, a version, and moves short enough to travel", () => {
    expect(RULES).toMatchObject({ id: "goalswipe", gv: 1 });
    for (const move of [commitMove(19, salt(1), CORNER), diveMove(FAR), revealMove(salt(1), CORNER)]) {
      expect(typeof move).toBe("string");
      expect(move.length).toBeLessThanOrEqual(MOVE_LENGTH);
    }
  });

  it("has the shooter commit to a shot, the keeper dive without seeing it, then the shooter show it", () => {
    let state = initial();
    expect(state.phase).toBe("commit");
    expect(turn(state)).toBe(0);
    state = play(state, commitMove(0, salt(0), CORNER), 0).state;
    expect(state.phase).toBe("dive");
    expect(JSON.stringify(state)).not.toContain(JSON.stringify(CORNER));
    expect(turn(state)).toBe(1);
    state = play(state, diveMove(FAR), 1).state;
    expect(state.phase).toBe("reveal");
    expect(turn(state)).toBe(0);
    state = play(state, revealMove(salt(0), CORNER), 0).state;
    expect(state.phase).toBe("commit");
    expect(state.kicks).toEqual([{ aim: CORNER, dive: FAR, outcome: "goal", bonus: null }]);
    expect(turn(state)).toBe(1);
  });

  it("saves a shot within the keeper's blind reach and calls a shot off the goal wide", () => {
    expect(kick(initial(), CORNER, NEAR).kicks[0].outcome).toBe("saved");
    expect(kick(initial(), WIDE, NEAR).kicks[0].outcome).toBe("wide");
    expect(REACH.blind).toBeGreaterThan(0.3);
  });

  it("refuses a shot other than the one committed to, or shown with another salt", () => {
    let state = play(initial(), commitMove(0, salt(0), CORNER), 0).state;
    state = play(state, diveMove(NEAR), 1).state;
    expect(play(state, revealMove(salt(0), snapAim({ x: 0.85, y: 0.3 })), 0).error).toBe("reveal");
    expect(play(state, revealMove(salt(5), CORNER), 0).error).toBe("reveal");
    expect(play(state, revealMove(salt(0), CORNER), 0).state.kicks).toHaveLength(1);
  });

  it("refuses a commitment made for another kick of the round", () => {
    let state = kick(initial(), CORNER, FAR);
    state = play(state, commitMove(0, salt(0), CORNER), 1).state;
    state = play(state, diveMove(FAR), 0).state;
    expect(play(state, revealMove(salt(0), CORNER), 1).error).toBe("reveal");
  });

  it("refuses a move out of turn, of the wrong kind for the moment, or malformed", () => {
    const state = initial();
    expect(play(state, commitMove(0, salt(0), CORNER), 1).error).toBe("turn");
    expect(play(state, diveMove(FAR), 0).error).toBe("bad");
    expect(play(state, revealMove(salt(0), CORNER), 0).error).toBe("bad");
    for (const bad of [7, "", "c", "cshort", `c${"*".repeat(43)}`, "dA", "d!!", "rAAAA", null]) expect(play(state, bad, 0).error, String(bad)).toBeDefined();
    const diving = play(state, commitMove(0, salt(0), CORNER), 0).state;
    expect(play(diving, commitMove(0, salt(0), CORNER), 1).error).toBe("bad");
    expect(play(diving, "d!!", 1).error).toBe("bad");
  });

  it("never changes the state it is given", () => {
    const state = initial();
    const kept = JSON.stringify(state);
    play(state, commitMove(0, salt(0), CORNER), 0);
    expect(JSON.stringify(state)).toBe(kept);
  });

  it("ends when one side cannot be caught, with that side the winner, and takes no more moves", () => {
    let state = initial();
    expect(result(state)).toBeNull();
    for (let index = 0; index < 6; index += 1) state = kick(state, CORNER, index % 2 ? NEAR : FAR);
    expect(result(state)).toEqual({ winner: 0 });
    expect(play(state, commitMove(6, salt(6), CORNER), 0).error).toBe("over");
  });

  it("goes to sudden death when five each leave it level", () => {
    let state = initial();
    for (let index = 0; index < 10; index += 1) state = kick(state, CORNER, FAR);
    expect(result(state)).toBeNull();
    state = kick(state, CORNER, FAR);
    state = kick(state, CORNER, NEAR);
    expect(result(state)).toEqual({ winner: 0 });
  });
});

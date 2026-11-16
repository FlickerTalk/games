import { describe, expect, it } from "vitest";
import { replay } from "../../../kit/src/match.js";
import { encodeSetup, generateRound } from "../src/generate.js";
import { turnOf, usefulNow } from "../src/round.js";
import { TEAM_RULES } from "../src/team-rules.js";

const SETUP = { team: true, tier: 0, golems: 4, hits: 4, caps: 0, most: 100, seed: "AbCdEfGh" };
const CODE = encodeSetup(SETUP);

function finish(state) {
  const moves = [];
  let now = state;
  while (!TEAM_RULES.result(now)) {
    const side = TEAM_RULES.turn(now);
    const move = usefulNow(now.round, side)[0];
    moves.push(move);
    now = TEAM_RULES.play(now, move, side).state;
  }
  return { state: now, moves };
}

describe("the team's match", () => {
  it("opens with the round's code from whoever starts, and deals the starter the first hand", () => {
    const start = TEAM_RULES.initial();
    expect(TEAM_RULES.turn(start)).toBe(0);
    expect(TEAM_RULES.play(start, CODE, 1)).toEqual({ error: "turn" });
    expect(TEAM_RULES.play(start, 2, 0)).toEqual({ error: "bad" });
    expect(TEAM_RULES.play(start, CODE.replace(/^S1/, "S0"), 0)).toEqual({ error: "bad" });
    const { state } = TEAM_RULES.play(start, CODE, 0);
    expect(state.code).toBe(CODE);
    expect(state.round.hands).toEqual(generateRound(SETUP).hands);
    expect(TEAM_RULES.result(state)).toBeNull();
  });

  it("takes each hit as one number from the player whose turn it is, a clink included", () => {
    const { state } = TEAM_RULES.play(TEAM_RULES.initial(), CODE, 0);
    const side = turnOf(state.round);
    const hand = state.round.hands[side];
    expect(TEAM_RULES.play(state, hand[0], 1 - side)).toEqual({ error: "turn" });
    expect(TEAM_RULES.play(state, 97, side)).toEqual({ error: "bad" });
    expect(TEAM_RULES.play(state, "2", side)).toEqual({ error: "bad" });
    const wrong = hand.find((divisor) => state.round.value % divisor !== 0);
    if (wrong) expect(TEAM_RULES.play(state, wrong, side).state.round.clinks[side]).toBe(1);
    const right = usefulNow(state.round, side)[0];
    expect(TEAM_RULES.play(state, right, side).state.round.value).toBe(state.round.value / right);
  });

  it("ends without a winner when the last golem is split, with the team's clinks", () => {
    const opened = TEAM_RULES.play(TEAM_RULES.initial(), CODE, 0).state;
    const { state, moves } = finish(opened);
    expect(TEAM_RULES.result(state)).toEqual({ winner: null, clinks: 0 });
    expect(TEAM_RULES.play(state, 2, 0)).toEqual({ error: "over" });
    const played = replay({ a: "one", b: "two", first: "one", moves: [CODE, ...moves], end: null }, TEAM_RULES);
    expect(played.ok).toBe(true);
    expect(played.rounds[0].end).toMatchObject({ k: "rules", winner: null });
    expect(new Set(played.actors)).toEqual(new Set(["one", "two"]));
  });
});

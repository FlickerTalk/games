import { describe, expect, it } from "vitest";
import { playOut, seeded } from "../../../kit/test/helpers.js";
import { DUEL_RULES, SEED_BYTES, commitText, keyOf, revealText, seedText } from "../src/duel-rules.js";
import { diceFor, hop, startRace } from "../src/rules.js";

const { initial, turn, play, result } = DUEL_RULES;
const A = Uint8Array.from({ length: SEED_BYTES }, (_, at) => at + 1);
const B = Uint8Array.from({ length: SEED_BYTES }, (_, at) => 200 - at);

function opened() {
  let state = initial();
  for (const [move, side] of [[commitText(A), 0], [seedText(B), 1], [revealText(A), 0]]) state = play(state, move, side).state;
  return state;
}

describe("the rules two phones replay", () => {
  it("are the kit's: an id, a version and the four functions", () => {
    expect(DUEL_RULES.id).toBe("squarehop");
    expect(DUEL_RULES.gv).toBe(1);
    expect(Object.isFrozen(DUEL_RULES)).toBe(true);
  });

  it("open a round with the starter's commitment, the other side's seed and the starter's reveal, each in a short move", () => {
    let state = initial();
    expect(turn(state)).toBe(0);
    expect(state.dice).toBeNull();
    const moves = [commitText(A), seedText(B), revealText(A)];
    for (const move of moves) expect(move.length).toBeLessThanOrEqual(64);
    state = play(state, moves[0], 0).state;
    expect(turn(state)).toBe(1);
    state = play(state, moves[1], 1).state;
    expect(turn(state)).toBe(0);
    expect(state.dice).toBeNull();
    state = play(state, moves[2], 0).state;
    expect(turn(state)).toBe(0);
    expect(state.race).toEqual(startRace());
    expect([...keyOf(state)]).toEqual([...A, ...B]);
    expect(state.dice).toEqual(diceFor(keyOf(state), 0));
  });

  it("refuse a reveal that is not what was committed, and anything out of order or malformed", () => {
    const committed = play(initial(), commitText(A), 0).state;
    const seeded = play(committed, seedText(B), 1).state;
    expect(play(seeded, revealText(B), 0).error).toBe("reveal");
    expect(play(initial(), seedText(B), 0).error).toBe("bad");
    expect(play(initial(), commitText(A), 1).error).toBe("turn");
    expect(play(committed, seedText(B), 0).error).toBe("turn");
    expect(play(committed, "sshort", 1).error).toBe("bad");
    expect(play(initial(), "c", 0).error).toBe("bad");
    expect(play(initial(), 3, 0).error).toBe("bad");
    expect(play(seeded, "0", 0).error).toBe("bad");
  });

  it("take the chosen die, 0 or 1, from the side to play and hop with it", () => {
    const state = opened();
    const after = play(state, "1", 0);
    expect(after.state.race).toEqual(hop(state.race, state.dice[1]).race);
    expect(after.state.dice).toEqual(diceFor(keyOf(state), 1));
    expect(play(state, "1", 1).error).toBe("turn");
    expect(play(state, "2", 0).error).toBe("bad");
    expect(play(state, 1, 0).error).toBe("bad");
    expect(state.race).toEqual(startRace());
  });

  it("end when a piece reaches the last square, and take no move after that", () => {
    const random = seeded(5);
    const pick = () => (random() < 0.5 ? "0" : "1");
    const opening = [commitText(A), seedText(B), revealText(A)];
    let at = 0;
    const played = playOut(DUEL_RULES, [() => (at < 3 ? opening[at++] : pick()), () => (at < 3 ? opening[at++] : pick())]);
    expect([0, 1]).toContain(played.result.winner);
    expect(result(played.state)).toEqual({ winner: played.state.race.winner });
    expect(play(played.state, "0", played.state.race.next).error).toBe("over");
    expect(result(opened())).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { playOut } from "../../../kit/test/helpers.js";
import { pieceOf } from "../src/pieces.js";
import { spots } from "../src/court.js";
import { encodeReport } from "../src/report.js";
import { placeInRound, startRound } from "../src/round.js";
import { initial, play, result, turn } from "../src/duel-rules.js";

const rules = { initial, play, result, turn };

function report(seed, pick = (found) => found[0]) {
  let round = startRound({ seed });
  while (!round.over) {
    const slot = round.slots.findIndex((id) => id && spots(round.court, pieceOf(id)).length);
    round = placeInRound(round, slot, pick(spots(round.court, pieceOf(round.slots[slot])))).round;
  }
  return { text: encodeReport(round), score: round.score, over: round.over };
}

describe("a round between two phones", () => {
  it("waits for the starter's report, then the other's, and compares their scores", () => {
    const one = report("SameSeed");
    const two = report("SameSeed", (found) => found.at(-1));
    let state = initial();
    expect(turn(state)).toBe(0);
    expect(result(state)).toBeNull();
    state = play(state, one.text, 0).state;
    expect(state.results[0]).toEqual({ score: one.score, done: one.over === "done", lines: expect.any(Number) });
    expect(turn(state)).toBe(1);
    expect(result(state)).toBeNull();
    state = play(state, two.text, 1).state;
    const winner = one.score === two.score ? null : one.score > two.score ? 0 : 1;
    expect(result(state)).toEqual({ winner });
  });

  it("is a draw when both phones score the same", () => {
    const one = report("SameSeed");
    const state = play(play(initial(), one.text, 0).state, one.text, 1).state;
    expect(result(state)).toEqual({ winner: null });
  });

  it("refuses a report out of turn, from other trays, unfinished, malformed, or after the end", () => {
    const one = report("SameSeed");
    const other = report("OtherOne");
    const started = play(initial(), one.text, 0).state;
    expect(play(initial(), one.text, 1)).toEqual({ error: "turn" });
    expect(play(started, other.text, 1)).toEqual({ error: "seed" });
    expect(play(initial(), one.text.slice(0, 12), 0)).toEqual({ error: "unfinished" });
    expect(play(initial(), "non sense", 0)).toEqual({ error: "bad" });
    expect(play(initial(), 7, 0)).toEqual({ error: "bad" });
    const ended = play(started, one.text, 1).state;
    expect(play(ended, one.text, 0)).toEqual({ error: "over" });
  });

  it("never changes the state it is given", () => {
    const state = initial();
    play(state, report("SameSeed").text, 0);
    expect(state).toEqual(initial());
  });

  it("plays a whole round with the kit's helper, ending legally", () => {
    const players = [() => report("Helper01").text, () => report("Helper01", (found) => found.at(-1)).text];
    const { moves, result: ended } = playOut(rules, players);
    expect(moves).toHaveLength(2);
    expect([0, 1, null]).toContain(ended.winner);
  });
});

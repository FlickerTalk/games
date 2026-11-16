import { describe, expect, it } from "vitest";
import { DUEL_RULES } from "../src/duel-rules.js";

const TRAIN = "TadaD";

describe("a train between two players", () => {
  it("is one move by the maker and one by the solver", () => {
    let state = DUEL_RULES.initial();
    expect(DUEL_RULES.turn(state)).toBe(0);
    state = DUEL_RULES.play(state, TRAIN, 0).state;
    expect(DUEL_RULES.turn(state)).toBe(1);
    expect(DUEL_RULES.result(state)).toBeNull();
    state = DUEL_RULES.play(state, "Sgd", 1).state;
    expect(DUEL_RULES.result(state)).toEqual({ winner: null, wrongs: 1 });
    expect(DUEL_RULES.play(state, "Sd", 1)).toEqual({ error: "over" });
  });

  it("refuses a train that is no pattern, has no gap or has more than one right answer", () => {
    for (const bad of ["Tadad", "TabcA", "TabCabC", "nonsense", 4]) expect(DUEL_RULES.play(DUEL_RULES.initial(), bad, 0).error, String(bad)).toBeDefined();
    expect(DUEL_RULES.play(DUEL_RULES.initial(), "TabCabC", 0)).toEqual({ error: "answers" });
  });

  it("refuses a move out of turn and a solution that does not finish the train", () => {
    expect(DUEL_RULES.play(DUEL_RULES.initial(), TRAIN, 1)).toEqual({ error: "turn" });
    const made = DUEL_RULES.play(DUEL_RULES.initial(), TRAIN, 0).state;
    expect(DUEL_RULES.play(made, "Sg", 1)).toEqual({ error: "unsolved" });
    expect(DUEL_RULES.play(made, "Sdd", 1)).toEqual({ error: "unsolved" });
    expect(DUEL_RULES.play(made, "junk", 1)).toEqual({ error: "bad" });
    expect(DUEL_RULES.play(made, "Sd", 0)).toEqual({ error: "turn" });
  });

  it("is named for this game alone", () => {
    expect(DUEL_RULES).toMatchObject({ id: "beatwagons", gv: 1 });
    expect(Object.isFrozen(DUEL_RULES)).toBe(true);
  });
});

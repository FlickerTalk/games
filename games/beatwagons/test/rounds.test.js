import { describe, expect, it } from "vitest";
import { freshRound, hintOf, keptRound, roundKey, savedRound, setTrain } from "../src/rounds.js";
import { makeTrain, wagonOf } from "../src/train.js";

const [A, B] = [wagonOf(0), wagonOf(1)];
const ONE = makeTrain([A, B, A, B], [3]);
const TWO = makeTrain([A, B, A, B, A, B], [1, 4]);
const round = (extra = {}) => freshRound({ kind: "level", trains: [ONE, TWO], seed: "seed", choices: 3, ...extra });

describe("a round", () => {
  it("starts on its first train, arriving, with the siding laid out for it", () => {
    const made = round();
    expect(made).toMatchObject({ kind: "level", at: 0, driver: "me", maker: null, wrongs: 0, phase: "arrive" });
    expect(made.candidates).toHaveLength(3);
    expect(made.candidates).toContain(B);
    expect(made.puzzle.placed).toEqual([A, B, A, null]);
  });

  it("moves on to the next train with a new siding and nothing flying", () => {
    const made = round();
    made.wrongs = 2;
    setTrain(made, 1, 5000);
    expect(made).toMatchObject({ at: 1, phase: "arrive", phaseAt: 5000, flying: null, back: null, struggle: 0, wrongs: 2 });
    expect(made.puzzle.train).toBe(TWO);
  });

  it("is kept under the conversation it is played in, and comes back on the train it was left on", () => {
    expect(roundKey({ chat: "c1" })).toBe("round/c1");
    expect(roundKey({ chat: null })).toBe("round/-");
    const made = round({ maker: "flick" });
    setTrain(made, 1, 0);
    made.wrongs = 1;
    const back = keptRound(JSON.parse(savedRound(made)));
    expect(back).toMatchObject({ kind: "level", at: 1, wrongs: 1, maker: "flick", seed: "seed" });
    expect(back.trains).toEqual([ONE, TWO]);
    expect(back.candidates).toEqual(made.candidates);
  });

  it("forgets what was kept if it is not a round of this game", () => {
    for (const bad of [null, {}, { v: 2 }, { v: 1, kind: "flick", codes: ["TadaD"] }, { v: 1, kind: "level", codes: ["nope"] }, { v: 1, kind: "level", codes: [] }]) expect(keptRound(bad)).toBeNull();
  });

  it("shows the hand on the right wagon until the player has placed one, and again after two wrong wagons on a train", () => {
    const made = round();
    made.phase = "solve";
    expect(hintOf(made, { taught: false })).toEqual({ candidate: made.candidates.indexOf(B), gap: 3, shape: false });
    expect(hintOf(made, { taught: true })).toBeNull();
    made.struggle = 2;
    expect(hintOf(made, { taught: true })).toMatchObject({ gap: 3, shape: true });
    expect(hintOf({ ...made, driver: "flick" }, { taught: false })).toBeNull();
    expect(hintOf({ ...made, phase: "tune" }, { taught: false })).toBeNull();
  });
});

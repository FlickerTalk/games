import { describe, expect, it } from "vitest";
import { canPlace, popsNow, trainShift, tuneNow } from "../src/playing.js";
import { ARRIVE_MS, LEAVE_MS, freshRound } from "../src/rounds.js";
import { STEP_MS } from "../src/tune.js";
import { makeTrain, wagonOf } from "../src/train.js";

const TRAIN = makeTrain([wagonOf(0), wagonOf(1, 2), wagonOf(0), wagonOf(1, 2)], [3]);
const round = (extra = {}) => ({ ...freshRound({ kind: "level", trains: [TRAIN], seed: "s", now: 1000 }), ...extra });

describe("a train on the screen", () => {
  it("rolls in from the left, stands still while it is completed, and rolls out to the right", () => {
    expect(trainShift(round(), 1000, 384)).toBeLessThan(-384);
    expect(trainShift(round(), 1000 + ARRIVE_MS / 2, 384)).toBeLessThan(0);
    expect(trainShift(round(), 1000 + ARRIVE_MS, 384)).toBeCloseTo(0);
    expect(trainShift(round({ phase: "solve" }), 5000, 384)).toBe(0);
    expect(trainShift(round({ phase: "leave", phaseAt: 5000 }), 5000 + LEAVE_MS / 2, 384)).toBeGreaterThan(0);
    expect(trainShift(round({ phase: "leave", phaseAt: 5000 }), 5000 + LEAVE_MS, 384)).toBeGreaterThan(384);
  });

  it("takes a wagon only from its driver, once it stands still and nothing else is on its way", () => {
    expect(canPlace(round())).toBe(false);
    expect(canPlace(round({ phase: "solve" }))).toBe(true);
    expect(canPlace(round({ phase: "solve", driver: "flick" }))).toBe(false);
    expect(canPlace(round({ phase: "solve", flying: {} }))).toBe(false);
    expect(canPlace(round({ phase: "solve", back: {} }))).toBe(false);
    expect(canPlace(null)).toBe(false);
  });

  it("says which wagon the puff is over while the tune plays, and how far along the train it is", () => {
    const playing = round({ phase: "tune", phaseAt: 2000 });
    expect(tuneNow(playing, 1900)).toBeNull();
    expect(tuneNow(playing, 2000 + STEP_MS * 1.5)).toMatchObject({ index: 1 });
    expect(tuneNow(playing, 2000 + STEP_MS * 1.5).within).toBeCloseTo(0.5, 5);
    expect(tuneNow(playing, 2000 + STEP_MS * 2).progress).toBeCloseTo(0.5, 5);
    expect(tuneNow(round({ phase: "solve" }), 3000)).toBeNull();
  });

  it("pops one note per beat out of the wagon that sounds", () => {
    const playing = round({ phase: "tune", phaseAt: 2000 });
    expect(popsNow(playing, 2000 + 10).map((pop) => pop.index)).toEqual([0]);
    const second = popsNow(playing, 2000 + STEP_MS * 1.6);
    expect(second.filter((pop) => pop.index === 1)).toHaveLength(2);
    for (const pop of second) expect(pop.progress).toBeGreaterThanOrEqual(0);
    expect(popsNow(round({ phase: "solve" }), 3000)).toEqual([]);
  });
});

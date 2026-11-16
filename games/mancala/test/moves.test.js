import { describe, expect, it } from "vitest";
import { CAPTURE_MS, SEED_MS, SPARKLE_MS, cuesBetween, lastMover, planBetween, planSow, plansAfter, sowFrame, sowMs } from "../src/moves.js";
import { initial, play } from "../src/rules.js";

const position = (pits, next = 0) => ({ pits, next });
const AROUND = position([0, 0, 0, 0, 0, 10, 0, 1, 1, 1, 1, 1, 1, 0], 0);
const after = (state, move) => play(state, move, state.next).state;

describe("how a mancala move is shown", () => {
  it("sows the seeds one by one counter-clockwise from the chosen pit", () => {
    const plan = planSow(initial(), 0, 0);
    expect(plan).toMatchObject({ side: 0, move: 0, from: 0, path: [1, 2, 3, 4], extra: false, capture: null });
    expect(plan.after).toEqual(after(initial(), 0).pits);
    expect(planSow({ ...initial(), next: 1 }, 2, 1)).toMatchObject({ from: 9, path: [10, 11, 12, 13], extra: true });
  });

  it("goes round past its own store, skips the other side's, and captures what lies across the empty pit it ends in", () => {
    const plan = planSow(AROUND, 5, 0);
    expect(plan.path).toEqual([6, 7, 8, 9, 10, 11, 12, 0, 1, 2]);
    expect(plan.capture).toEqual({ landing: 2, across: 10, store: 6, seeds: 3 });
    expect(plan.after).toEqual([1, 1, 0, 0, 0, 0, 4, 2, 2, 2, 0, 2, 2, 0]);
  });

  it("gives the turn again when the last seed lands in the side's own store", () => {
    expect(planSow(initial(), 2, 0)).toMatchObject({ path: [3, 4, 5, 6], extra: true, capture: null });
  });

  it("shows nothing moving for a move the rules refuse, or a position that does not follow from it", () => {
    expect(planSow(initial(), 2, 1)).toBeNull();
    expect(planSow(initial(), 6, 0)).toBeNull();
    expect(planBetween(initial(), after(initial(), 0), 0)).toMatchObject({ from: 0 });
    expect(planBetween(initial(), after(initial(), 0), 1)).toBeNull();
    expect(planBetween(initial(), after(initial(), 0), null)).toBeNull();
    expect(planBetween(null, initial(), 0)).toBeNull();
  });

  it("lifts the seeds out of the chosen pit, then drops them one by one, each pit counting its seed as it lands", () => {
    const plan = planSow(initial(), 0, 0);
    const start = sowFrame(plan, 0);
    expect(start.pits.slice(0, 5)).toEqual([0, 4, 4, 4, 4]);
    expect(start.hop).toEqual({ from: 0, to: 1, progress: 0 });
    const second = sowFrame(plan, SEED_MS * 1.5);
    expect(second.pits.slice(0, 5)).toEqual([0, 5, 4, 4, 4]);
    expect(second.hop).toEqual({ from: 1, to: 2, progress: 0.5 });
    const end = sowFrame(plan, sowMs(plan));
    expect(end).toMatchObject({ pits: plan.after, hop: null, done: true });
  });

  it("drops a seed no more than three times a second", () => {
    expect(SEED_MS).toBeGreaterThanOrEqual(1000 / 3);
    const plan = planSow(AROUND, 5, 0);
    const landings = [];
    let before = sowFrame(plan, 0).pits;
    for (let ms = 10; ms <= sowMs(plan); ms += 10) {
      const now = sowFrame(plan, ms).pits;
      if (now.some((seeds, pit) => seeds > before[pit])) landings.push(ms);
      before = now;
    }
    expect(Math.min(...landings.slice(1).map((ms, at) => ms - landings[at]))).toBeGreaterThanOrEqual(1000 / 3 - 10);
  });

  it("flies the captured seeds from both pits into the store once the last seed has landed", () => {
    const plan = planSow(AROUND, 5, 0);
    const travel = SEED_MS * plan.path.length;
    const landed = sowFrame(plan, travel - 1);
    expect(landed.capture).toBeNull();
    const flying = sowFrame(plan, travel + CAPTURE_MS / 2);
    expect(flying.capture).toBeCloseTo(0.5, 6);
    expect([flying.pits[2], flying.pits[10], flying.pits[6]]).toEqual([0, 0, 1]);
    expect(sowFrame(plan, travel + CAPTURE_MS)).toMatchObject({ pits: plan.after, capture: null, done: true });
  });

  it("sparkles the store each time one of the side's seeds lands in it", () => {
    const plan = planSow(initial(), 2, 0);
    const stored = SEED_MS * 4;
    expect(sowFrame(plan, stored - 1).sparkle).toBeNull();
    expect(sowFrame(plan, stored + SPARKLE_MS / 2).sparkle).toBeCloseTo(0.5, 6);
    expect(sowMs(plan)).toBe(stored + SPARKLE_MS);
  });

  it("names the sounds of what happens between two frames", () => {
    const extra = planSow(initial(), 2, 0);
    expect(cuesBetween(extra, -1, 0)).toEqual([]);
    expect(cuesBetween(extra, -1, SEED_MS)).toEqual(["seed"]);
    expect(cuesBetween(extra, -1, sowMs(extra))).toEqual(["seed", "seed", "seed", "store", "extra"]);
    const around = planSow(AROUND, 5, 0);
    expect(cuesBetween(around, SEED_MS * 9, sowMs(around))).toEqual(["seed", "capture"]);
  });

  it("plans each move made since a position, whoever made it, or nothing when one does not follow", () => {
    const plans = plansAfter(initial(), [2, 0, 3]);
    expect(plans.map((plan) => [plan.side, plan.from])).toEqual([[0, 2], [0, 0], [1, 10]]);
    expect(plansAfter(initial(), [])).toEqual([]);
    expect(plansAfter(initial(), [2, 6])).toBeNull();
  });

  it("knows who made the last move of a round, an extra turn included", () => {
    expect(lastMover([2])).toBe(0);
    expect(lastMover([2, 0])).toBe(0);
    expect(lastMover([2, 0, 3])).toBe(1);
    expect(lastMover([])).toBeNull();
    expect(lastMover(undefined)).toBeNull();
  });
});

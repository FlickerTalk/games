// @vitest-environment node
import { describe, expect, it } from "vitest";
import { STEPS_PER_SECOND, presentAt, scheduleOf, tally } from "../src/fair.js";
import { flickStep, newFlick } from "../src/robot.js";

const SETTINGS = { rate: 1.2, rise: 0.15, seconds: 45 };

function playRound({ seed, skill, lead = () => 0 }) {
  const schedule = scheduleOf(seed, SETTINGS);
  const flick = newFlick(seed);
  const claims = [];
  const puffs = [];
  for (let step = 0; step < SETTINGS.seconds * STEPS_PER_SECOND; step += 1) {
    const { pops, scores } = tally(schedule, claims);
    const shown = presentAt(schedule, step, pops);
    const did = flickStep(flick, { step, shown, skill, lead: lead(scores[1]) });
    if (!did) continue;
    expect(shown.some((one) => one.balloon.id === did.id)).toBe(true);
    if (did.kind === "pop") claims.push({ id: did.id, t: step, seat: 1 });
    if (did.kind === "puff") puffs.push(step);
  }
  return { score: tally(schedule, claims).scores[1], claims, puffs, schedule };
}

const SEEDS = ["a1", "b2", "c3", "d4", "e5", "f6"];
const total = (options) => SEEDS.reduce((sum, seed) => sum + playRound({ seed, ...options }).score, 0);

describe("Flick at the stall", () => {
  it("does nothing while there is nothing to pop", () => {
    const flick = newFlick("quiet");
    for (let step = 0; step < 400; step += 1) expect(flickStep(flick, { step, shown: [], skill: 0.8, lead: 0 })).toBeNull();
  });

  it("plays the same round the same way every time", () => {
    expect(playRound({ seed: "same", skill: 0.5 }).claims).toEqual(playRound({ seed: "same", skill: 0.5 }).claims);
  });

  it("pops at a pace a beginner can beat at the first level, and clearly more at the top of its skill", () => {
    const [low, high] = [total({ skill: 0.35 }), total({ skill: 0.84 })];
    const available = SEEDS.reduce((sum, seed) => sum + tally(scheduleOf(seed, SETTINGS), []).scores[0] + scheduleOf(seed, SETTINGS).length, 0);
    expect(low / SEEDS.length).toBeGreaterThan(6);
    expect(low).toBeLessThan(available * 0.4);
    expect(high).toBeGreaterThan(low * 1.3);
    expect(high).toBeLessThan(available * 0.75);
  });

  it("eases off while it is ahead and tries harder while it is behind", () => {
    const ahead = total({ skill: 0.6, lead: () => 12 });
    const behind = total({ skill: 0.6, lead: () => -12 });
    expect(behind).toBeGreaterThan(ahead);
  });

  it("touches a cloud now and then while learning, and then rests a second", () => {
    const beginner = SEEDS.flatMap((seed) => playRound({ seed, skill: 0.1 }).puffs);
    const expert = SEEDS.flatMap((seed) => playRound({ seed, skill: 1 }).puffs);
    expect(beginner.length).toBeGreaterThan(expert.length);
    expect(expert).toEqual([]);
  });
});

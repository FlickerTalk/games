import { describe, expect, it } from "vitest";
import { CAUGHT_MOST, CRAFT_V, moveCraft, newCraft } from "../src/crafts.js";
import { flickStep, newFlick } from "../src/robot.js";

const METRICS = { w: 360, h: 600, unit: 360, craft: 72 };
const enemy = (id, u, v = 0.3, owner = null) => ({ enemy: { id, owner }, u, v, r: 26 });

function fly(steps, { seen = [], hazards = () => [], skill = 1, lead = 0, mate = newCraft(0), craft = newCraft(1), flick = newFlick("AAAAAAAA") } = {}) {
  for (let step = 0; step < steps; step += 1) {
    flickStep(flick, { step, craft, mate, seen, hazards: hazards(step), skill, lead, metrics: METRICS });
    moveCraft(craft);
  }
  return { craft, mate, flick };
}

describe("Flick as the teammate", () => {
  it("is the same pilot for the same seed", () => {
    const seen = [enemy(1, 0.8), enemy(2, 0.6)];
    expect(fly(120, { seen, skill: 0.5 }).craft.u).toBe(fly(120, { seen, skill: 0.5 }).craft.u);
  });

  it("flies under an enemy on its own side to shoot it", () => {
    const { craft } = fly(120, { seen: [enemy(1, 0.85)] });
    expect(Math.abs(craft.u - 0.85)).toBeLessThan(0.05);
  });

  it("leaves the player the enemies that are nearer to the player", () => {
    const mate = newCraft(0);
    mate.u = 0.2;
    const { craft } = fly(160, { mate, seen: [enemy(1, 0.22), enemy(2, 0.25)] });
    expect(craft.u).toBeGreaterThan(0.45);
  });

  it("goes for its own core and never parks under the player's", () => {
    const { craft } = fly(160, { seen: [enemy(1, 0.3, 0.3, 0), enemy(2, 0.7, 0.3, 1)] });
    expect(Math.abs(craft.u - 0.7)).toBeLessThan(0.05);
  });

  it("comes over to free the player when the player is caught", () => {
    const mate = newCraft(0);
    mate.u = 0.15;
    mate.caught = CAUGHT_MOST;
    const { craft } = fly(140, { mate, seen: [enemy(1, 0.9)] });
    expect(Math.abs(craft.u - 0.15) * METRICS.w).toBeLessThan(METRICS.craft * 0.8);
  });

  it("steps out of the way of what falls on it when it is good, and is slower to when it is not", () => {
    const falling = (craft) => (step) => [{ key: 1, u: craft.u, v: 0.45 + step * 0.0065, r: 20 }];
    const good = newCraft(1);
    const start = good.u;
    fly(50, { craft: good, hazards: falling(good), skill: 1 });
    expect(Math.abs(good.u - start) * METRICS.w).toBeGreaterThan(METRICS.craft * 0.5);
    let dodged = 0;
    for (const seed of ["AAAAAAAA", "AAAAAAAB", "AAAAAAAC", "AAAAAAAD", "AAAAAAAE", "AAAAAAAF", "AAAAAAAG", "AAAAAAAH"]) {
      const poor = newCraft(1);
      fly(50, { craft: poor, hazards: falling(poor), skill: 0.2, flick: newFlick(seed) });
      if (Math.abs(poor.u - start) * METRICS.w > METRICS.craft * 0.5) dodged += 1;
    }
    expect(dodged).toBeLessThan(8);
  });

  it("takes it easy when it has popped many more than the player", () => {
    const seen = [enemy(1, 0.9)];
    const keen = fly(30, { seen, lead: 0 }).craft.u;
    const easy = fly(30, { seen, lead: 30 }).craft.u;
    expect(easy).toBeLessThan(keen);
  });

  it("waits on its own side when there is nothing to do", () => {
    const { craft } = fly(100, {});
    expect(craft.u).toBeGreaterThan(0.5);
    expect(CRAFT_V).toBeGreaterThan(0.5);
  });
});

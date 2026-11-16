import { describe, expect, it } from "vitest";
import { FAR_SCALE } from "../src/ball.js";
import { snapAim, snapDive } from "../src/kicks.js";
import { playLayout, toScreen } from "../src/layout.js";
import { FLIGHT, RESULT, ballAt, bulgeAt, keeperAt, reactionOf, ringOf, shooterPoseAt, trailOf } from "../src/moves.js";

const layout = playLayout(384, 801, { fill: true });
const AIM = snapAim({ x: 0.2, y: 0.4 });
const kick = (more = {}) => ({ aim: AIM, dive: null, diveAt: null, ringAt: null, flyAt: 1000, landAt: 1000 + FLIGHT, outcome: null, ...more });

describe("the ball of a kick", () => {
  it("waits on its spot until it is kicked", () => {
    for (const waiting of [null, kick({ aim: null, flyAt: null }), kick()]) {
      expect(ballAt(layout, waiting, 900)).toMatchObject({ x: layout.ball.x, y: layout.ball.y, scale: 1, flying: false });
    }
  });

  it("flies from its spot to where it was aimed, shrinking with the distance and turning", () => {
    const [x, y] = toScreen(layout, AIM);
    const half = ballAt(layout, kick(), 1000 + FLIGHT / 2);
    expect(half.flying).toBe(true);
    expect(half.y).toBeLessThan(layout.ball.y);
    expect(half.y).toBeGreaterThan(y);
    expect(half.scale).toBeLessThan(1);
    expect(half.turn).toBeGreaterThan(0);
    const landed = ballAt(layout, kick({ outcome: "goal" }), 1000 + FLIGHT);
    expect(landed.x).toBeCloseTo(x, 3);
    expect(landed.y).toBeCloseTo(y, 3);
    expect(landed.scale).toBeCloseTo(FAR_SCALE, 5);
  });

  it("curves a little on its way", () => {
    const [x] = toScreen(layout, AIM);
    const half = ballAt(layout, kick(), 1000 + FLIGHT / 2);
    expect(half.x).not.toBeCloseTo((layout.ball.x + x) / 2, 0);
  });

  it("drops into the net after a goal, stays in the gloves after a save, and flies on and fades when wide", () => {
    const [x, y] = toScreen(layout, AIM);
    const late = 1000 + FLIGHT + RESULT * 0.8;
    expect(ballAt(layout, kick({ outcome: "goal" }), late).y).toBeGreaterThan(y);
    expect(ballAt(layout, kick({ outcome: "saved" }), late)).toMatchObject({ x, y, alpha: 1 });
    const wide = kick({ aim: snapAim({ x: 1.2, y: 0.5 }), outcome: "wide" });
    const [wx] = toScreen(layout, wide.aim);
    const gone = ballAt(layout, wide, late);
    expect(gone.x).toBeGreaterThan(wx);
    expect(gone.alpha).toBeLessThan(0.3);
  });

  it("leaves a trail only while in the air", () => {
    expect(trailOf(layout, kick(), 900)).toEqual([]);
    expect(trailOf(layout, kick(), 1000 + FLIGHT / 2).length).toBeGreaterThanOrEqual(3);
    expect(trailOf(layout, kick({ outcome: "goal" }), 1000 + FLIGHT + 50)).toEqual([]);
  });
});

describe("the keeper of a kick", () => {
  it("stands ready in the middle of the goal until they dive", () => {
    expect(keeperAt(layout, null, 0)).toMatchObject({ x: layout.keeper.x, y: layout.keeper.y, pose: "ready", lean: 0, spin: 0 });
    expect(keeperAt(layout, kick(), 1100).pose).toBe("ready");
  });

  it("dives towards the side they chose, leaning that way, higher for a high ball", () => {
    const left = keeperAt(layout, kick({ dive: snapDive({ x: 0.1, y: 0.3 }), diveAt: 1000 }), 1400);
    expect(left).toMatchObject({ pose: "dive" });
    expect(left.x).toBeLessThan(layout.keeper.x - 40);
    expect(left.lean).toBeLessThan(-0.4);
    const right = keeperAt(layout, kick({ dive: snapDive({ x: 0.9, y: 0.3 }), diveAt: 1000 }), 1400);
    expect(right.x).toBeGreaterThan(layout.keeper.x + 40);
    expect(right.lean).toBeGreaterThan(0.4);
    const high = keeperAt(layout, kick({ dive: snapDive({ x: 0.5, y: 0.9 }), diveAt: 1000 }), 1400);
    expect(high.y).toBeLessThan(layout.keeper.y - 10);
    expect(Math.abs(high.lean)).toBeLessThan(0.05);
  });

  it("spins once, proudly, after a save, looks surprised after a goal and cheers a shot that goes wide", () => {
    const dive = { dive: snapDive({ x: 0.2, y: 0.4 }), diveAt: 1000 };
    const land = 1000 + FLIGHT;
    const turning = keeperAt(layout, kick({ ...dive, outcome: "saved" }), land + 300);
    expect(turning.pose).toBe("catch");
    expect(turning.spin).toBeGreaterThan(1);
    expect(keeperAt(layout, kick({ ...dive, outcome: "saved" }), land + 1200).spin).toBeCloseTo(Math.PI * 2, 5);
    expect(keeperAt(layout, kick({ ...dive, outcome: "goal" }), land + 300).pose).toBe("miss");
    expect(keeperAt(layout, kick({ outcome: "goal" }), land + 300).pose).toBe("miss");
    expect(keeperAt(layout, kick({ outcome: "wide" }), land + 300)).toMatchObject({ pose: "cheer", x: layout.keeper.x });
  });
});

describe("what goes with a kick", () => {
  it("has the shooter kick as the ball leaves, then cheer a goal or shrug", () => {
    expect(shooterPoseAt(null, 0)).toBe("ready");
    expect(shooterPoseAt(kick(), 900)).toBe("ready");
    expect(shooterPoseAt(kick(), 1100)).toBe("kick");
    expect(shooterPoseAt(kick({ outcome: "goal" }), 1000 + FLIGHT + 100)).toBe("cheer");
    expect(shooterPoseAt(kick({ outcome: "saved" }), 1000 + FLIGHT + 100)).toBe("miss");
  });

  it("bulges the net after a goal and lets it settle", () => {
    const land = 1000 + FLIGHT;
    expect(bulgeAt(kick({ outcome: "goal" }), land)).toBe(1);
    expect(bulgeAt(kick({ outcome: "goal" }), land + 500)).toBeLessThan(1);
    expect(bulgeAt(kick({ outcome: "goal" }), land + 2000)).toBe(0);
    expect(bulgeAt(kick({ outcome: "saved" }), land)).toBe(0);
    expect(bulgeAt(kick(), 900)).toBe(0);
  });

  it("shows the warning ring from the moment it is given until the ball lands", () => {
    const warned = kick({ ringAt: 500 });
    expect(ringOf(kick(), 1100)).toBeNull();
    expect(ringOf(warned, 400)).toBeNull();
    expect(ringOf(warned, 500).progress).toBe(0);
    expect(ringOf(warned, 1000).progress).toBeGreaterThan(0.5);
    expect(ringOf(warned, 1000 + FLIGHT)).toBeNull();
  });

  it("stirs the crowd for a goal or a save, not for a shot that goes wide", () => {
    const land = 1000 + FLIGHT;
    expect(reactionOf(kick({ outcome: "goal" }), land + 100)).toBeGreaterThan(0.5);
    expect(reactionOf(kick({ outcome: "saved" }), land + 100)).toBeGreaterThan(0.3);
    expect(reactionOf(kick({ outcome: "wide" }), land + 100)).toBe(0);
    expect(reactionOf(kick(), 900)).toBe(0);
  });
});

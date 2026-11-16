import { describe, expect, it } from "vitest";
import { overlap } from "../../../kit/src/canvas/layout.js";
import { SIZES, checkTargets, eachSize, inside } from "../../../kit/test/canvas/sizes.js";
import { onTarget, snapAim } from "../src/kicks.js";
import { aimOf, playLayout, playTargets, swipeFor, toGoal, toScreen } from "../src/layout.js";

const LEAST = { speaker: 48, music: 48, pause: 48 };
const least = (target) => LEAST[target.kind] ?? 88;
const figureBox = ({ x, y, size }) => ({ x: x - size * 0.42, y: y - size * 0.7, w: size * 0.84, h: size * 1.25 });

describe("the play screen's layout", () => {
  it("keeps the bar, the two tallies, the goal and the ball's spot inside the frame and apart, at every size", () => {
    eachSize(({ width, height, fill }) => {
      const layout = playLayout(width, height, { fill });
      const name = `${width}x${height}`;
      const parts = { bar: layout.bar, mine: layout.tallies[0], theirs: layout.tallies[1], goal: layout.goal, spot: layout.spot };
      for (const [key, area] of Object.entries(parts)) expect(inside(area, width, height), `${name} ${key}`).toBe(true);
      const keys = Object.keys(parts);
      keys.forEach((one, at) => keys.slice(at + 1).forEach((two) => expect(overlap(parts[one], parts[two]), `${name} ${one} ${two}`).toBe(false)));
      expect(layout.goal.y + layout.goal.h, name).toBeLessThan(layout.spot.y);
    });
  });

  it("gives the ball a spot to swipe from of 88 px or more, 132 where the frame is tall, in the middle and clear of the bottom corners", () => {
    eachSize(({ width, height, fill }) => {
      const { spot, ball } = playLayout(width, height, { fill });
      expect(spot.w, `${width}x${height}`).toBeGreaterThanOrEqual(88);
      expect(spot.w, `${width}x${height}`).toBeLessThanOrEqual(132);
      expect(ball.x).toBe(width / 2);
      expect(ball.size).toBeGreaterThanOrEqual(28);
    });
    expect(playLayout(384, 801, { fill: true }).spot.w).toBe(132);
  });

  it("draws the goal as wide as three quarters of an upright phone, 1.65 times as wide as tall", () => {
    const { goal } = playLayout(384, 801, { fill: true });
    expect(goal.w).toBeCloseTo(384 * 0.76, 0);
    expect(goal.w / goal.h).toBeCloseTo(1.65, 2);
    for (const [width, height, fill] of SIZES) expect(playLayout(width, height, { fill }).goal.h, `${width}x${height}`).toBeGreaterThanOrEqual(78);
  });

  it("stands the keeper in the goal and the shooter beside the ball, both whole inside the frame", () => {
    eachSize(({ width, height, fill }) => {
      const { keeper, shooter, goal, bar } = playLayout(width, height, { fill });
      const name = `${width}x${height}`;
      expect(inside(figureBox(keeper), width, height), `${name} keeper`).toBe(true);
      expect(inside(figureBox(shooter), width, height), `${name} shooter`).toBe(true);
      expect(overlap(figureBox(keeper), bar), name).toBe(false);
      expect(keeper.x).toBe(goal.x + goal.w / 2);
      expect(keeper.size, name).toBeGreaterThanOrEqual(56);
      expect(shooter.x, name).toBeLessThan(width / 2);
    });
  });

  it("lays three named thirds over the goal for whoever is to shoot or to dive, 88 px or more, apart from the controls", () => {
    eachSize(({ width, height, fill }) => {
      const layout = playLayout(width, height, { fill });
      for (const role of ["shoot", "dive"]) {
        const targets = playTargets(layout, { role });
        checkTargets(targets, { width, height, fill, name: role, least });
        expect(targets.filter((one) => one.kind === role).map((one) => one.value)).toEqual(["left", "middle", "right"]);
      }
      expect(playTargets(layout, {}).map((one) => one.kind)).toEqual(["pause", "speaker", "music"]);
    });
  });

  it("puts the volume line first when it is open, and leaves the thirds out from under it", () => {
    const layout = playLayout(384, 801, { fill: true });
    const targets = playTargets(layout, { role: "dive", volume: true });
    expect(targets[0].kind).toBe("volume");
    expect(targets.some((one) => one.kind === "dive")).toBe(false);
  });

  it("turns a point of the goal into a point of the screen and back", () => {
    const layout = playLayout(384, 801, { fill: true });
    const { goal } = layout;
    expect(toScreen(layout, { x: 0, y: 0 })).toEqual([goal.x, goal.y + goal.h]);
    expect(toScreen(layout, { x: 1, y: 1 })).toEqual([goal.x + goal.w, goal.y]);
    const back = toGoal(layout, { x: goal.x + goal.w * 0.25, y: goal.y + goal.h * 0.25 });
    expect(back.x).toBeCloseTo(0.25, 5);
    expect(back.y).toBeCloseTo(0.75, 5);
  });
});

describe("a swipe from the ball", () => {
  it("sends the ball along its direction, further up the longer it is", () => {
    eachSize(({ width, height, fill }) => {
      const layout = playLayout(width, height, { fill });
      const { ball, reach } = layout;
      const straight = aimOf(layout, { x: ball.x, y: ball.y - reach });
      expect(straight.x, `${width}x${height}`).toBeCloseTo(0.5, 1);
      expect(straight.y, `${width}x${height}`).toBeCloseTo(0.5, 1);
      const longer = aimOf(layout, { x: ball.x, y: ball.y - reach * 1.12 });
      expect(longer.y).toBeGreaterThan(straight.y);
      const left = aimOf(layout, { x: ball.x - reach * 0.2, y: ball.y - reach });
      expect(left.x).toBeLessThan(0.45);
      expect(aimOf(layout, { x: ball.x + reach * 0.2, y: ball.y - reach }).x).toBeGreaterThan(0.55);
    });
  });

  it("rolls a short swipe along the grass into the goal, and sends one far too long over the bar", () => {
    const layout = playLayout(384, 801, { fill: true });
    const { ball, reach } = layout;
    const short = aimOf(layout, { x: ball.x, y: ball.y - 40 });
    expect(short.y).toBeLessThan(0.12);
    expect(onTarget(short)).toBe(true);
    expect(onTarget(aimOf(layout, { x: ball.x, y: ball.y - reach * 1.6 }))).toBe(false);
    expect(onTarget(aimOf(layout, { x: ball.x - reach, y: ball.y - reach }))).toBe(false);
  });

  it("is not a shot when it barely moves or goes down the screen", () => {
    const layout = playLayout(384, 801, { fill: true });
    const { ball } = layout;
    expect(aimOf(layout, { x: ball.x + 3, y: ball.y - 10 })).toBeNull();
    expect(aimOf(layout, { x: ball.x, y: ball.y + 80 })).toBeNull();
  });

  it("can be worked back from the shot it gives, for the teaching hand", () => {
    eachSize(({ width, height, fill }) => {
      const layout = playLayout(width, height, { fill });
      for (const aim of [{ x: 0.2, y: 0.3 }, { x: 0.8, y: 0.7 }, { x: 0.5, y: 0.5 }].map(snapAim)) {
        const found = aimOf(layout, swipeFor(layout, aim));
        expect(found.x, `${width}x${height}`).toBeCloseTo(aim.x, 1);
        expect(found.y, `${width}x${height}`).toBeCloseTo(aim.y, 1);
      }
    });
  });
});

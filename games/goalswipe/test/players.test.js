import { describe, expect, it } from "vitest";
import { draw, shapes } from "../../../kit/test/canvas/recorder.js";
import { drawFigure } from "../../../kit/src/avatars/index.js";
import { KEEPER_POSES, SHOOTER_POSES, drawKeeper, drawShooter, gloveSpots } from "../src/players.js";
import { THEME } from "../src/theme.js";

const ME = { who: "ari", hair: "none", hairColour: "ink" };
const AT = { x: 200, y: 300, size: 190 };

const handsOf = (pose, time) =>
  draw((ctx) => drawFigure(ctx, AT.x, AT.y, AT.size, { ...ME, pose, time }))
    .calls.filter((call) => call.op === "arc" && Math.abs(call.radius - 7) < 0.01)
    .map((call) => call.points[0]);

describe("the players", () => {
  it("are the kit's figures with the player's own face, in the poses of a shooter and of a keeper", () => {
    expect(SHOOTER_POSES).toEqual(["ready", "kick", "cheer", "miss"]);
    expect(KEEPER_POSES).toEqual(["ready", "dive", "catch", "miss", "cheer"]);
    const seen = SHOOTER_POSES.map((pose) => shapes(draw((ctx) => drawShooter(ctx, AT, ME, pose, THEME, 0.3))).join("\n"));
    expect(new Set(seen).size).toBe(4);
    const kept = KEEPER_POSES.map((pose) => shapes(draw((ctx) => drawKeeper(ctx, AT, ME, THEME, { pose, time: 0.3 }))).join("\n"));
    expect(new Set(kept).size).toBe(5);
  });

  it("put the keeper's big gloves on the figure's hands in every pose", () => {
    for (const [pose, time] of [["lose", 0.3], ["jump", 0], ["block", 0.3], ["celebrate", 0.3], ["celebrate", 1.1]]) {
      const hands = handsOf(pose, time);
      expect(hands, pose).toHaveLength(2);
      const gloves = gloveSpots(pose, time).map(([x, y]) => [AT.x + x, AT.y + y]);
      gloves.forEach(([x, y], at) => {
        expect(x, `${pose} ${at}`).toBeCloseTo(hands[at][0], 1);
        expect(y, `${pose} ${at}`).toBeCloseTo(hands[at][1], 1);
      });
    }
  });

  it("draw the gloves in their own colour, more than the bare figure, and lean and spin the keeper whole", () => {
    const bare = draw((ctx) => drawFigure(ctx, AT.x, AT.y, AT.size, { ...ME, pose: "lose", face: "focused", time: 0.3 }));
    const keeper = draw((ctx) => drawKeeper(ctx, AT, ME, THEME, { pose: "ready", time: 0.3 }));
    expect(keeper.calls.length).toBeGreaterThan(bare.calls.length);
    expect(keeper.calls.filter((call) => call.op === "set" && call.value === THEME.art.glove).length).toBeGreaterThanOrEqual(4);
    expect(keeper.depth).toBe(0);
    const leaning = draw((ctx) => drawKeeper(ctx, AT, ME, THEME, { pose: "dive", lean: 0.8 }));
    expect(shapes(leaning)).not.toEqual(shapes(draw((ctx) => drawKeeper(ctx, AT, ME, THEME, { pose: "dive" }))));
    expect(shapes(draw((ctx) => drawKeeper(ctx, AT, ME, THEME, { pose: "catch", spin: 2, time: 0.3 })))).not.toEqual(shapes(draw((ctx) => drawKeeper(ctx, AT, ME, THEME, { pose: "catch", time: 0.3 }))));
  });

  it("draws Flick as either player", () => {
    const flick = draw((ctx) => drawKeeper(ctx, AT, { who: "flick" }, THEME, { pose: "ready" }));
    expect(flick.calls.length).toBeGreaterThan(40);
    expect(draw((ctx) => drawShooter(ctx, AT, { who: "flick" }, "kick", THEME, 0)).depth).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { drawFrame } from "../src/frame.js";
import { drawLookArt, stageArea } from "../src/home-art.js";
import { labelFor } from "../src/labels.js";
import { HELICOPTERS, PLANES } from "../src/levels.js";
import { TEXTS } from "../src/texts.js";
import { THEME } from "../src/theme.js";
import { makeGame, press, targetOf, unclipped } from "./harness.js";

const arcs = (game) => draw((pen) => drawFrame(pen, game, THEME, 1)).calls.filter((call) => call.op === "arc").length;

describe("the home screen", () => {
  it("puts a little sky with both aircraft in the largest free space, between the faces and the play button on a tall phone", async () => {
    const { game } = await makeGame({ opening: { solo: true }, width: 384, height: 801 });
    const area = stageArea(game.state, game.targets());
    const avatar = targetOf(game, "avatar");
    const play = targetOf(game, "play");
    expect(area.y).toBeGreaterThanOrEqual(avatar.y + avatar.h);
    expect(area.y + area.h).toBeLessThanOrEqual(play.y);
    expect(area.h).toBeGreaterThan(200);
    const ctx = draw((pen) => drawFrame(pen, game, THEME, 1));
    expect(colours(ctx)).toEqual(expect.arrayContaining([THEME.art.skies.morning.sky, THEME.art.colours.sunny.body, THEME.art.colours.lilac.body]));
  });

  it("keeps everything inside the frame at every size", async () => {
    for (const [width, height, fill] of [[384, 801, true], [360, 343, false], [844, 338, true], [1280, 748, true]]) {
      for (const opening of [{ solo: true }, { live: true }, { chat: undefined }]) {
        const { game } = await makeGame({ opening, width, height, fill });
        const ctx = draw((pen) => drawFrame(pen, game, THEME, 1));
        const area = bounds(unclipped(ctx));
        expect(area.left, `${width}x${height}`).toBeGreaterThanOrEqual(-1);
        expect(area.right, `${width}x${height}`).toBeLessThanOrEqual(width + 1);
        expect(area.bottom, `${width}x${height}`).toBeLessThanOrEqual(height + 1);
        expect(ctx.depth).toBe(0);
      }
    }
  });

  it("shows the player waiting on the play button once they started a round with the other person, and names it so", async () => {
    const { game } = await makeGame({ opening: { live: true } });
    const before = arcs(game);
    expect(labelFor(targetOf(game, "play"), game.state, game.duel.status)).toBe(TEXTS.en.play);
    await press(game, "play");
    expect(game.state.screen).toBe("home");
    expect(arcs(game)).toBeGreaterThanOrEqual(before + 6);
    expect(labelFor(targetOf(game, "play"), game.state, game.duel.status)).toBe(TEXTS.en.waiting);
  });

  it("draws every aircraft as a picture of its own inside its tile, in the colour the player chose", () => {
    const tile = { x: 20, y: 20, w: 120, h: 120 };
    const seen = new Set();
    for (const look of [...PLANES, ...HELICOPTERS]) {
      const ctx = draw((pen) => drawLookArt(pen, tile, look, THEME, 1, "mint"));
      const area = bounds(painted(ctx));
      expect(area.left, look).toBeGreaterThanOrEqual(tile.x);
      expect(area.right, look).toBeLessThanOrEqual(tile.x + tile.w);
      expect(area.top, look).toBeGreaterThanOrEqual(tile.y);
      expect(area.bottom, look).toBeLessThanOrEqual(tile.y + tile.h);
      expect(ctx.depth, look).toBe(0);
      expect(colours(ctx), look).toContain(THEME.art.colours.mint.body);
      seen.add(shapes(ctx).join("\n"));
    }
    expect(seen.size).toBe(PLANES.length + HELICOPTERS.length);
  });

  it("ticks only the aircraft being flown on the looks screen", async () => {
    const { game } = await makeGame({ opening: { solo: true } });
    await press(game, "looks");
    const flown = draw((pen) => drawFrame(pen, game, THEME, 1)).calls.length;
    await press(game, "tab", "helicopter");
    const other = draw((pen) => drawFrame(pen, game, THEME, 1));
    expect(other.depth).toBe(0);
    await press(game, "look", 0);
    expect(draw((pen) => drawFrame(pen, game, THEME, 1)).calls.length).toBeGreaterThan(other.calls.length);
    expect(flown).toBeGreaterThan(50);
  });
});

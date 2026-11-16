import { describe, expect, it } from "vitest";
import { bounds, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { stageArea } from "../src/home-art.js";
import { THEME } from "../src/theme.js";
import { drawFrame } from "../src/frame.js";
import { makeGame, targetOf } from "./harness.js";

describe("the home screen", () => {
  it("puts the little table in the largest free space, between the faces and the play button on a tall phone", async () => {
    const { game } = await makeGame({ opening: { solo: true }, width: 384, height: 801 });
    const area = stageArea(game.state, game.targets());
    const avatar = targetOf(game, "avatar");
    const play = targetOf(game, "play");
    expect(area.y).toBeGreaterThanOrEqual(avatar.y + avatar.h);
    expect(area.y + area.h).toBeLessThanOrEqual(play.y);
    expect(area.h).toBeGreaterThan(200);
  });

  it("keeps everything inside the frame at every size", async () => {
    for (const [width, height, fill] of [[384, 801, true], [360, 343, false], [844, 338, true], [1280, 748, true]]) {
      for (const opening of [{ solo: true }, { live: true }, { chat: undefined }]) {
        const { game } = await makeGame({ opening, width, height, fill });
        const area = bounds(painted(draw((pen) => drawFrame(pen, game, THEME, 1))));
        expect(area.left, `${width}x${height}`).toBeGreaterThanOrEqual(-1);
        expect(area.right, `${width}x${height}`).toBeLessThanOrEqual(width + 1);
        expect(area.bottom, `${width}x${height}`).toBeLessThanOrEqual(height + 1);
      }
    }
  });
});

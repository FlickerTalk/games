import { describe, expect, it } from "vitest";
import { bounds, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawPlay, ballsShown } from "../src/board.js";
import { toScreen } from "../src/layout.js";
import { COUNTDOWN } from "../src/rounds.js";
import { TABLE } from "../src/table.js";
import { THEME } from "../src/theme.js";
import { makeGame, press } from "./harness.js";

const texts = (ctx) => ctx.calls.filter((call) => call.op === "fillText").map((call) => call.text);

async function playing(options = {}) {
  const made = await makeGame({ opening: { solo: true }, ...options });
  await press(made.game, "play");
  return made;
}

describe("the play screen", () => {
  it("draws inside the frame at every size it may get, upright or on its side", async () => {
    for (const [width, height, fill] of [[384, 801, true], [360, 343, false], [844, 338, true], [1280, 748, true]]) {
      const { game, later } = await playing({ width, height, fill });
      await later(COUNTDOWN + 800);
      const ctx = draw((pen) => drawPlay(pen, game, THEME, 4));
      const area = bounds(painted(ctx));
      expect(area.left, `${width}x${height}`).toBeGreaterThanOrEqual(-1);
      expect(area.top, `${width}x${height}`).toBeGreaterThanOrEqual(-1);
      expect(area.right, `${width}x${height}`).toBeLessThanOrEqual(width + 1);
      expect(area.bottom, `${width}x${height}`).toBeLessThanOrEqual(height + 1);
      expect(ctx.depth).toBe(0);
    }
  });

  it("writes no words, only the countdown's digits while it runs", async () => {
    const { game, later } = await playing();
    await later(500);
    expect(texts(draw((pen) => drawPlay(pen, game, THEME, 1)))).toEqual(["3"]);
    await later(COUNTDOWN);
    expect(texts(draw((pen) => drawPlay(pen, game, THEME, 4)))).toEqual([]);
  });

  it("shows the balls where the match has them, seen from this phone's end", async () => {
    const { game, later } = await playing();
    await later(COUNTDOWN + 600);
    const { round, layout } = game.state;
    const [shown] = ballsShown(round, game.now());
    const ball = round.match.balls[0];
    expect(toScreen(layout, shown.u, shown.v)).toEqual(toScreen(layout, ball.x, ball.y));
    const turned = { ...round, seat: 1 };
    const [flipped] = ballsShown(turned, game.now());
    expect(flipped.u).toBeCloseTo(1 - ball.x, 12);
    expect(flipped.v).toBeCloseTo(TABLE.length - ball.y, 12);
  });

  it("covers the table with the pause buttons while paused", async () => {
    const { game, later } = await playing();
    await later(COUNTDOWN + 200);
    await press(game, "pause");
    const ctx = draw((pen) => drawPlay(pen, game, THEME, 4));
    expect(ctx.calls.filter((call) => call.op === "fillRect").length).toBeGreaterThanOrEqual(1);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FLICK, startPick } from "../../../kit/src/avatars/index.js";
import { bounds, colours, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawFrame } from "../src/frame.js";
import { drawLookArt } from "../src/home-art.js";
import { THEME } from "../src/theme.js";
import { makeGame, playOut, tap, targetOf } from "./harness.js";

const { art, ui } = THEME;

beforeEach(() => vi.useRealTimers());
afterEach(() => vi.restoreAllMocks());

function drawn(game, time = 1) {
  const ctx = draw((pen) => drawFrame(pen, game, THEME, time));
  expect(ctx.depth).toBe(0);
  expect(ctx.calls.length).toBeGreaterThan(20);
  return ctx;
}

describe("every screen", () => {
  it("draws home with the ruler and its balloons, the three rulers to choose, Flick's seat and the big play button", async () => {
    const { game } = await makeGame({ opening: { solo: true } });
    const seen = colours(drawn(game));
    for (const colour of [art.ruler.wood, art.balloons[0], ui.accent, FLICK.colour]) expect(seen).toContain(colour);
  });

  it("draws the looks, arrow tips and places, a wrapped gift for each not yet received", async () => {
    const { game } = await makeGame();
    await tap(game, targetOf(game, "looks"));
    expect(colours(drawn(game))).toContain(art.arrow.suction);
    expect(colours(drawn(game))).toContain(art.present.box);
    await tap(game, targetOf(game, "tab", "place"));
    expect(colours(drawn(game))).toContain(art.places.meadow.ground);
  });

  it("shows each arrow tip and each place inside its tile", () => {
    const area = { x: 20, y: 20, w: 100, h: 100 };
    for (const [kind, looks] of [["tip", ["suction", "cork", "flower"]], ["place", ["meadow", "mountain", "clouds"]]]) {
      for (const look of looks) {
        const ctx = draw((pen) => drawLookArt(pen, area, kind, look, THEME, 0));
        expect(ctx.depth, look).toBe(0);
        if (kind === "place") continue;
        const box = bounds(painted(ctx));
        expect(box.left, look).toBeGreaterThanOrEqual(area.x);
        expect(box.right, look).toBeLessThanOrEqual(area.x + area.w);
      }
    }
  });

  it("draws the pick screen of the player's face", async () => {
    const { game } = await makeGame();
    game.state.pick = startPick(game.state.player);
    game.state.screen = "avatar";
    drawn(game);
  });

  it("draws the end of a round with the player and Flick side by side, each with their score", async () => {
    const { game, later } = await makeGame({ opening: { solo: true } });
    await tap(game, targetOf(game, "play"));
    await playOut(game, later);
    const ctx = drawn(game, 40);
    const seen = colours(ctx);
    expect(seen).toContain(FLICK.colour);
    expect(seen).toContain(ui.accent);
    const texts = ctx.calls.filter((call) => call.op === "fillText").map((call) => call.text);
    expect(texts).toContain(String(game.state.outcome.score));
    expect(texts).toContain(String(game.state.outcome.flick));
  }, 60_000);
});

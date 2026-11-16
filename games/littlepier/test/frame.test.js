import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FLICK, startPick } from "../../../kit/src/avatars/index.js";
import { colours, draw } from "../../../kit/test/canvas/recorder.js";
import { drawFrame } from "../src/frame.js";
import { THEME } from "../src/theme.js";
import { makeGame, memoryStore, playOut, tap, targetOf } from "./harness.js";

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
  it("draws home with the pier, the player's face, the album and the big play button", async () => {
    const { game } = await makeGame({ opening: { solo: true } });
    const seen = colours(drawn(game));
    expect(seen).toContain(art.pier.wood);
    expect(seen).toContain(ui.accent);
    expect(seen).toContain(FLICK.colour);
  });

  it("draws the album: the creatures already met in colour, the others as quiet shapes, and how many of the 24", async () => {
    const store = memoryStore({ littlepier: JSON.stringify({ taught: true, album: [6, 12], rounds: 3 }) });
    const { game } = await makeGame({ store });
    await tap(game, targetOf(game, "variant", "album"));
    const ctx = drawn(game);
    expect(colours(ctx)).toContain(art.creatures[12]);
    expect(colours(ctx)).toContain(art.silhouette);
    expect(ctx.calls.filter((call) => call.op === "fillText").map((call) => call.text)).toContain("2/24");
  });

  it("draws the looks, charms and fishing spots, a wrapped gift for each not yet received", async () => {
    const { game } = await makeGame();
    await tap(game, targetOf(game, "looks"));
    expect(colours(drawn(game))).toContain(art.charms.star);
    expect(colours(drawn(game))).toContain(art.present.box);
    await tap(game, targetOf(game, "tab", "place"));
    expect(colours(drawn(game))).toContain(art.pier.wood);
  });

  it("draws the pick screen of the player's face", async () => {
    const { game } = await makeGame();
    game.state.pick = startPick(game.state.player);
    game.state.screen = "avatar";
    drawn(game);
  });

  it("draws the end of a round with Flick and the player cheering beside the bucket", async () => {
    const { game, later } = await makeGame({ opening: { solo: true } });
    await tap(game, targetOf(game, "play"));
    await playOut(game, later);
    const seen = colours(drawn(game, 40));
    expect(seen).toContain(FLICK.colour);
    expect(seen).toContain(art.bucket.body);
    expect(seen).toContain(ui.accent);
  }, 60_000);
});

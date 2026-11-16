import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FLICK, PROFILES } from "../../../kit/src/avatars/index.js";
import { bounds, colours, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawPlay } from "../src/board.js";
import { depthOf } from "../src/layout.js";
import { visitorAt } from "../src/pond.js";
import { tokensFor } from "../../../kit/test/canvas/themes.js";
import { THEME, themeFor } from "../src/theme.js";
import { makeGame, tap, targetOf } from "./harness.js";

const { art, ui } = THEME;

async function playing(opening = {}) {
  const made = await makeGame({ opening });
  await tap(made.game, targetOf(made.game, "play"));
  return made;
}

const texts = (ctx) => ctx.calls.filter((call) => call.op === "fillText").map((call) => call.text);

beforeEach(() => vi.useRealTimers());
afterEach(() => vi.restoreAllMocks());

describe("the play screen", () => {
  it("draws the sky, the water, the pier with the player sitting on it, and the app-coloured bar on top", async () => {
    const { game } = await playing();
    const ctx = draw((pen) => drawPlay(pen, game.state, THEME, 2));
    const seen = colours(ctx);
    expect(seen).toContain(art.days.morning.sky);
    expect(seen).toContain(art.days.morning.water);
    expect(seen).toContain(art.pier.wood);
    expect(seen).toContain(PROFILES[0].colour);
    expect(seen).toContain(ui.surface);
    expect(seen).not.toContain(FLICK.colour);
    expect(texts(ctx)).toContain("0");
    expect(ctx.depth).toBe(0);
  });

  it("seats Flick at the other end of the pier with its own line, in the FlickerTalk conversation", async () => {
    const { game } = await playing({ solo: true });
    const seen = colours(draw((pen) => drawPlay(pen, game.state, THEME, 2)));
    expect(seen).toContain(FLICK.colour);
    expect(seen).toContain(art.hook.flick);
  });

  it("draws each visitor where the round says it swims, and nothing outside the water", async () => {
    const { game } = await playing();
    const { round, layout } = game.state;
    const fish = { id: 0, kind: 12, depth: 0.5, speed: 1, direction: 1, enter: round.time - 3 };
    game.state.round = { ...round, visitors: [fish] };
    const at = visitorAt(fish, round.time, round.pace);
    const ctx = draw((pen) => drawPlay(pen, game.state, THEME, 2));
    expect(colours(ctx)).toContain(art.creatures[12]);
    const near = painted(ctx).filter(([x, y]) => Math.abs(x - at.x * layout.width) < layout.fish && Math.abs(y - depthOf(layout, at.y)) < layout.fish);
    expect(near.length).toBeGreaterThan(10);
  });

  it("shows the teaching hand only while it is wanted", async () => {
    const { game } = await playing();
    expect(game.state.hint).toBe(true);
    expect(colours(draw((pen) => drawPlay(pen, game.state, THEME, 1)))).toContain(ui.halo);
    game.state.hint = false;
    expect(colours(draw((pen) => drawPlay(pen, game.state, THEME, 1)))).not.toContain(ui.halo);
  });

  it("pauses on a calm card: look out of the window, then go on or go home", async () => {
    const { game } = await playing();
    await tap(game, targetOf(game, "pause"));
    const ctx = draw((pen) => drawPlay(pen, game.state, THEME, 1));
    expect(colours(ctx)).toContain(art.window.sky);
    expect(colours(ctx)).toContain(art.window.iris);
    expect(colours(ctx)).toContain(ui.shade);
    const window = bounds(painted(ctx).filter(([, y]) => y > game.state.layout.bar.y + game.state.layout.bar.h));
    expect(window.top).toBeGreaterThanOrEqual(0);
  });

  it("puts the anglers in a boat when the boat is the chosen fishing spot", async () => {
    const { game } = await playing();
    game.state.progress = { ...game.state.progress, chosen: { charm: "star", place: "boat" } };
    const dark = themeFor(tokensFor("mono-dark"), { dark: true });
    const seen = colours(draw((pen) => drawPlay(pen, game.state, dark, 1)));
    expect(seen).toContain(dark.art.boat.hull);
    expect(seen).not.toContain(dark.art.pier.wood);
  });

  it("sets a moon in the night sky and lets some creatures glow", async () => {
    const { game } = await playing();
    game.state.day = "night";
    const { round } = game.state;
    game.state.round = { ...round, visitors: [{ id: 0, kind: 6, depth: 0.4, speed: 1, direction: 1, enter: round.time - 4 }] };
    const seen = colours(draw((pen) => drawPlay(pen, game.state, THEME, 1)));
    expect(seen).toContain(art.days.night.sky);
    expect(seen).toContain(art.glow);
  });
});

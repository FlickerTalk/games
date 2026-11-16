import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FLICK, PROFILES } from "../../../kit/src/avatars/index.js";
import { colours, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { tokensFor } from "../../../kit/test/canvas/themes.js";
import { drawPlay, poseOf } from "../src/board.js";
import { rulerX } from "../src/layout.js";
import { FLIGHT } from "../src/round.js";
import { THEME, themeFor } from "../src/theme.js";
import { makeGame, shootAt, tap, targetOf, touchRuler, truth } from "./harness.js";

const { art, ui } = THEME;
const texts = (ctx) => ctx.calls.filter((call) => call.op === "fillText").map((call) => call.text);
const seenIn = (game, time = 2, theme = THEME) => colours(draw((pen) => drawPlay(pen, game.state, theme, time)));

async function playing(options) {
  const made = await makeGame(options);
  await tap(made.game, targetOf(made.game, "play"));
  return made;
}

beforeEach(() => vi.useRealTimers());
afterEach(() => vi.restoreAllMocks());

describe("the play screen", () => {
  it("draws the meadow, the ruler with its two ends, the balloons, the archer and the app-coloured bar and card, with no word", async () => {
    const { game } = await playing();
    const ctx = draw((pen) => drawPlay(pen, game.state, THEME, 2));
    const seen = colours(ctx);
    for (const colour of [art.places.meadow.sky, art.ruler.wood, art.arrow.bow, PROFILES[0].colour, ui.surface, art.card.dot]) expect(seen).toContain(colour);
    expect(seen).not.toContain(FLICK.colour);
    expect(texts(ctx)).toEqual(expect.arrayContaining(["0", "10"]));
    for (const text of texts(ctx)) expect(text).toMatch(/^[\d.,\s]+$/);
    expect(ctx.depth).toBe(0);
  });

  it("stands Flick beside the player in the FlickerTalk conversation, on a phone held upright", async () => {
    const { game } = await playing({ opening: { solo: true } });
    expect(seenIn(game)).toContain(FLICK.colour);
  });

  it("draws at every size the walk visits, small rooms included", async () => {
    for (const [width, height, fill] of [[360, 343, false], [328, 343, false], [844, 338, true], [1280, 748, true], [360, 588, true]]) {
      const { game } = await playing({ width, height, fill, opening: { solo: true } });
      const ctx = draw((pen) => drawPlay(pen, game.state, THEME, 1));
      expect(ctx.depth, `${width}x${height}`).toBe(0);
      expect(ctx.calls.length).toBeGreaterThan(100);
    }
  });

  it("shows where the finger aims, and the archer aiming there", async () => {
    const { game } = await playing();
    expect(poseOf(game.state)).toBe("idle");
    touchRuler(game, 0.3, "down");
    expect(poseOf(game.state)).toBe("aiming");
    const x = rulerX(game.state.layout, 0.3);
    const ctx = draw((pen) => drawPlay(pen, game.state, THEME, 2));
    expect(painted(ctx).filter(([px]) => Math.abs(px - x) < 0.01).length).toBeGreaterThanOrEqual(2);
  });

  it("answers a close shot with the true place lit, a short thread, stars and a cheer", async () => {
    const { game, later } = await playing();
    shootAt(game, truth(game));
    expect(poseOf(game.state)).toBe("release");
    await later(FLIGHT * 1000 + 300);
    expect(poseOf(game.state)).toBe("cheer");
    const seen = seenIn(game);
    for (const colour of [art.marker.glow, art.thread.short, art.marker.mine, ui.accent]) expect(seen).toContain(colour);
  });

  it("answers a far shot kindly: a long thread to the true place, one star, a surprised archer and no cross", async () => {
    const { game, later } = await playing();
    shootAt(game, truth(game) > 0.5 ? 0.02 : 0.98);
    await later(FLIGHT * 1000 + 300);
    expect(poseOf(game.state)).toBe("oops");
    const seen = seenIn(game);
    expect(seen).toContain(art.thread.long);
    expect(seen).toContain(art.marker.glow);
  });

  it("marks Flick's guess with a diamond and a thread of its own once its arrow has landed", async () => {
    const { game, later } = await playing({ opening: { solo: true } });
    const threads = () => draw((pen) => drawPlay(pen, game.state, THEME, 2)).calls.filter((call) => call.op === "setLineDash" && call.segments.length).length;
    shootAt(game, truth(game));
    await later(FLIGHT * 1000 + 100);
    expect(threads()).toBe(1);
    await later(FLIGHT * 1000 + 100);
    expect(threads()).toBe(2);
    expect(seenIn(game)).toContain(art.marker.rival);
  });

  it("shows the teaching hand only while it is wanted", async () => {
    const { game } = await playing();
    expect(seenIn(game, 1)).toContain(ui.halo);
    game.state.hint = false;
    expect(seenIn(game, 1)).not.toContain(ui.halo);
  });

  it("pauses under a shade with two buttons, and draws the chosen place softened on a dark page", async () => {
    const { game } = await playing();
    game.state.progress = { ...game.state.progress, chosen: { tip: "cork", place: "mountain" } };
    const dark = themeFor(tokensFor("mono-dark"), { dark: true });
    await tap(game, targetOf(game, "pause"));
    const seen = seenIn(game, 1, dark);
    expect(seen).toContain(dark.ui.shade);
    expect(seen).toContain(dark.art.places.mountain.near);
    expect(seen).not.toContain(dark.art.places.meadow.hill);
  });
});

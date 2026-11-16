import { describe, expect, it } from "vitest";
import { colours, draw, painted, bounds } from "../../../kit/test/canvas/recorder.js";
import { drawWork } from "../src/screen-art.js";
import { THEME } from "../src/theme.js";
import { makeGame, openPage, tap } from "./harness.js";

const shown = (game) => draw((ctx) => drawWork(ctx, game, THEME, 1));

describe("the colouring screen's drawing", () => {
  it("draws the bar, the page and the strips, all inside the frame", async () => {
    const { game } = await makeGame();
    await openPage(game, "cat");
    const ctx = shown(game);
    const box = bounds(painted(ctx));
    expect(box.left).toBeGreaterThanOrEqual(-1);
    expect(box.right).toBeLessThanOrEqual(game.state.width + 1);
    expect(colours(ctx)).toContain(THEME.ui.surface);
    expect(colours(ctx)).toContain(THEME.art.paper);
    expect(ctx.depth).toBe(0);
  });

  it("shows the hand until the first fill, then not", async () => {
    const { game } = await makeGame();
    await openPage(game, "cat");
    const before = shown(game).calls.length;
    game.state.taught = true;
    expect(shown(game).calls.length).toBeLessThan(before);
  });

  it("draws the free paper in its own kind, with the mirror's guide when it is on", async () => {
    const { game } = await makeGame();
    await tap(game, "variant", "free");
    await tap(game, "play");
    game.state.drawing = { paper: "dark", items: [] };
    expect(colours(shown(game))).toContain(THEME.art.papers.dark);
    const plain = shown(game).calls.filter((call) => call.op === "setLineDash").length;
    game.state.mirror = true;
    expect(shown(game).calls.filter((call) => call.op === "setLineDash").length).toBeGreaterThan(plain);
  });

  it("draws the line being made before it is lifted", async () => {
    const { game } = await makeGame();
    await openPage(game, "cat");
    game.state.taught = true;
    const strokes = shown(game).calls.filter((call) => call.op === "stroke").length;
    game.state.stroke = { p: 2, w: 0, m: 0, points: [[10, 10], [60, 60]] };
    expect(shown(game).calls.filter((call) => call.op === "stroke").length).toBe(strokes + 1);
  });
});

import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawGallery, drawHomeScreen, drawPictureScreen, drawPicture, drawShelf } from "../src/menus-art.js";
import { THEME } from "../src/theme.js";
import { colourAll, makeGame, openPage, tap } from "./harness.js";

describe("the menus' drawing", () => {
  it("draws the home with a picture for each way to play", async () => {
    const { game } = await makeGame({ opening: { solo: true } });
    const ctx = draw((pen) => drawHomeScreen(pen, game, THEME, 0));
    expect(colours(ctx)).toContain(THEME.ui.accent);
    expect(colours(ctx)).toContain(THEME.art.paper);
    expect(ctx.depth).toBe(0);
  });

  it("draws a wrapped present for each page still to come, and the open pages as small sheets", async () => {
    const { game } = await makeGame();
    await tap(game, "play");
    while (game.state.shelfPage < game.state.layout.pages - 1) await tap(game, "next");
    const ctx = draw((pen) => drawShelf(pen, game, THEME, 0));
    expect(colours(ctx)).toContain(THEME.art.present.box);
    const box = bounds(painted(ctx));
    expect(box.right).toBeLessThanOrEqual(game.state.width + 1);
  });

  it("frames a finished picture, with confetti, and hangs it on the wall", async () => {
    const { game, later } = await makeGame();
    await openPage(game, "flower");
    await colourAll(game, later);
    expect(game.state.screen).toBe("picture");
    const ctx = draw((pen) => drawPictureScreen(pen, game, THEME, game.now() / 1000 + 0.3));
    for (const colour of THEME.art.confetti.slice(0, 3)) expect(colours(ctx)).toContain(colour);
    await tap(game, "home");
    await tap(game, "looks");
    expect(game.state.screen).toBe("gallery");
    const wall = draw((pen) => drawGallery(pen, game, THEME, 0));
    expect(colours(wall)).toContain(THEME.art.frames[0]);
  });

  it("draws a free drawing on its own paper", () => {
    const ctx = draw((pen) => drawPicture(pen, { kind: "free", drawing: { paper: "cream", items: [{ k: "s", t: 0, p: 2, x: 40, y: 40, m: 0 }] } }, { x: 0, y: 0, w: 150, h: 180, scale: 0.5 }, THEME));
    expect(colours(ctx)).toContain(THEME.art.papers.cream);
    expect(colours(ctx)).toContain(THEME.art.paints[2]);
  });
});

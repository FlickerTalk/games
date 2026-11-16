import { describe, expect, it } from "vitest";
import { required } from "../src/geometry.js";
import { FINISH_MS, endLine, extendLine, fillAt, finishFree, openFree, openPage, placeStamp, rubOut, startLine, toPage, tokenOf, undo } from "../src/colouring.js";
import { pageOf } from "../src/pages.js";
import { makeGame, pagePoint } from "./harness.js";

describe("the colouring itself", () => {
  it("turns a point of the screen into a point of the page, and nothing outside it", async () => {
    const { game } = await makeGame();
    await openPage(game, "cat");
    const { page } = game.state.layout;
    expect(toPage(game.state, { x: page.x, y: page.y })).toEqual({ x: 0, y: 0 });
    const bottom = toPage(game.state, { x: page.x + page.w / 2, y: page.y + page.h - 0.001 });
    expect(bottom.x).toBeCloseTo(150, 3);
    expect(bottom.y).toBeCloseTo(360, 2);
    expect(toPage(game.state, { x: page.x - 5, y: page.y })).toBeNull();
  });

  it("writes the chosen paint as its token", () => {
    expect(tokenOf({ colour: 4, pattern: null })).toBe("4");
    expect(tokenOf({ colour: 4, pattern: "dots" })).toBe("d4");
  });

  it("waits a moment after the last zone before celebrating, so the paint is seen spreading", async () => {
    const { game } = await makeGame();
    await openPage(game, "flower");
    const zones = required(pageOf("flower"));
    for (const zone of zones) fillAt(game, zone);
    expect(game.state.endAt).toBe(game.now() + FINISH_MS);
    expect(game.state.screen).toBe("page");
  });

  it("does nothing when the zone already has that paint, so undo is never wasted", async () => {
    const { game } = await makeGame();
    await openPage(game, "cat");
    fillAt(game, 0);
    fillAt(game, 0);
    expect(game.state.history).toHaveLength(1);
    undo(game);
    expect(game.state.work.fills).toEqual({});
    undo(game);
    expect(game.state.work.fills).toEqual({});
  });

  it("draws a line, mirrored on the free paper when the mirror is on, and stamps", async () => {
    const { game } = await makeGame();
    await openFree(game, { fresh: true });
    game.state.mirror = true;
    game.state.freeTool = "brush2";
    expect(startLine(game, pagePoint(game, 20, 20))).toBe(true);
    extendLine(game, pagePoint(game, 60, 80));
    endLine(game);
    expect(game.state.drawing.items[0]).toMatchObject({ k: "l", w: 2, m: 1 });
    game.state.freeTool = "stamp1";
    placeStamp(game, pagePoint(game, 100, 100));
    expect(game.state.drawing.items[1]).toMatchObject({ k: "s", t: 1, x: 100, y: 100, m: 1 });
    expect(rubOut(game, pagePoint(game, 200, 100))).toBe(true);
    expect(game.state.drawing.items).toHaveLength(1);
  });

  it("hangs a free drawing on the wall and starts a clean paper of the same kind", async () => {
    const { game, store } = await makeGame();
    await openFree(game, { fresh: true });
    game.state.drawing = { paper: "dark", items: [{ k: "s", t: 0, p: 3, x: 50, y: 50, m: 0 }] };
    finishFree(game);
    await game.idle();
    expect(game.state.screen).toBe("picture");
    expect(game.state.wall).toEqual(["f:0"]);
    expect(JSON.parse(store.kept.get("free/0")).items).toHaveLength(1);
    expect(JSON.parse(store.kept.get("free/now"))).toMatchObject({ paper: "dark", items: [] });
  });
});

import { describe, expect, it } from "vitest";
import { openPage as openSheet } from "../src/colouring.js";
import { pageOf } from "../src/pages.js";
import { required } from "../src/geometry.js";
import { drag, makeGame, openPage, pagePoint, tap, tapAt } from "./harness.js";

describe("a finger on the screen", () => {
  it("leaves only a fading ring where it touches the paper outside every zone", async () => {
    const { game } = await makeGame();
    await openPage(game, "beach");
    const before = JSON.stringify(game.state.work);
    await tapAt(game, pagePoint(game, 2, 2));
    const page = pageOf("beach");
    if (required(page).length) expect(JSON.stringify(game.state.work)).toBe(before);
    await openSheet(game, "cat");
    await tapAt(game, pagePoint(game, 4, 356));
    expect(game.state.moments.some((one) => one.kind === "miss")).toBe(true);
    expect(game.state.work.fills).toEqual({});
  });

  it("fills nothing when it slides across the page with the fill tool", async () => {
    const { game } = await makeGame();
    await openPage(game, "cat");
    await drag(game, [pagePoint(game, 150, 200), pagePoint(game, 150, 230), pagePoint(game, 150, 260)]);
    expect(game.state.work.fills).toEqual({});
  });

  it("turns the shelf's pages with a swipe as well as with the arrows", async () => {
    const { game } = await makeGame({ width: 360, height: 343, fill: false });
    await tap(game, "play");
    const middle = { x: 180, y: 220 };
    await drag(game, [middle, { x: 120, y: 222 }, { x: 40, y: 224 }]);
    expect(game.state.shelfPage).toBe(1);
    await drag(game, [{ x: 40, y: 224 }, { x: 200, y: 222 }, { x: 300, y: 220 }]);
    expect(game.state.shelfPage).toBe(0);
    expect(game.state.screen).toBe("shelf");
  });

  it("presses a bar button only when lifted over the same button", async () => {
    const { game } = await makeGame();
    await openPage(game, "cat");
    const back = game.state.layout.buttons.find((one) => one.kind === "back");
    game.pointer({ type: "down", x: back.x + 10, y: back.y + 10 });
    game.pointer({ type: "up", x: back.x + 200, y: back.y + 200 });
    await game.idle();
    expect(game.state.screen).toBe("page");
  });
});

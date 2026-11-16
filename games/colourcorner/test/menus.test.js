import { describe, expect, it } from "vitest";
import { act } from "../src/menus.js";
import { makeGame, openPage, tap } from "./harness.js";

describe("what each button does", () => {
  it("takes a plain colour from a pot and a pattern from a pattern pot, drawn in that colour", async () => {
    const { game } = await makeGame();
    await openPage(game, "cat");
    act(game, { kind: "paint", value: 5 });
    expect([game.state.colour, game.state.pattern]).toEqual([5, null]);
    act(game, { kind: "pattern", value: "dots" });
    expect([game.state.colour, game.state.pattern]).toEqual([5, "dots"]);
    act(game, { kind: "paint", value: 2 });
    expect([game.state.colour, game.state.pattern]).toEqual([2, null]);
  });

  it("puts the eraser down when a paint is chosen, and the brush down when a pattern is", async () => {
    const { game } = await makeGame();
    await openPage(game, "cat");
    act(game, { kind: "tool", value: "eraser" });
    act(game, { kind: "paint", value: 1 });
    expect(game.state.tool).toBe("fill");
    act(game, { kind: "tool", value: "brush" });
    act(game, { kind: "pattern", value: "stripes" });
    expect(game.state.tool).toBe("fill");
  });

  it("switches the free paper's mirror on and off, and changes its paper", async () => {
    const { game } = await makeGame();
    await tap(game, "variant", "free");
    await tap(game, "play");
    expect(game.state.screen).toBe("free");
    act(game, { kind: "tool", value: "mirror" });
    expect(game.state.mirror).toBe(true);
    act(game, { kind: "tool", value: "mirror" });
    expect(game.state.mirror).toBe(false);
    act(game, { kind: "tool", value: "paper2" });
    expect(game.state.drawing.paper).toBe("dark");
    act(game, { kind: "tool", value: "stamp3" });
    expect(game.state.freeTool).toBe("stamp3");
    act(game, { kind: "paint", value: 0 });
    expect(game.state.freeTool).toBe("stamp3");
  });

  it("pages through the shelf", async () => {
    const { game } = await makeGame({ width: 360, height: 343, fill: false });
    await tap(game, "play");
    act(game, { kind: "next" });
    expect(game.state.shelfPage).toBe(1);
    act(game, { kind: "prev" });
    expect(game.state.shelfPage).toBe(0);
  });
});

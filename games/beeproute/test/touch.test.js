import { describe, expect, it } from "vitest";
import { makeGame, played, tap, targetOf } from "./harness.js";

const centre = (area) => ({ x: area.x + area.w / 2, y: area.y + area.h / 2 });

async function building() {
  const made = await makeGame();
  await tap(made.game, targetOf(made.game, "variant", "make"));
  await tap(made.game, targetOf(made.game, "play"));
  return made;
}

function drag(game, cells) {
  const points = cells.map((at) => centre(targetOf(game, "cell", at)));
  game.pointer({ type: "down", ...points[0], id: 1 });
  for (const point of points.slice(1)) game.pointer({ type: "move", ...point, id: 1 });
  game.pointer({ type: "up", ...points.at(-1), id: 1 });
}

describe("making a level with a finger", () => {
  it("paints a whole row of walls in one stroke, and a stroke from a wall takes walls away", async () => {
    const { game } = await building();
    drag(game, [13, 14, 15, 16]);
    expect([13, 14, 15, 16].map((at) => game.state.build.level.cells[at]).join("")).toBe("####");
    drag(game, [14, 15]);
    expect([13, 14, 15, 16].map((at) => game.state.build.level.cells[at]).join("")).toBe("#..#");
  });

  it("swaps the tool with one touch and keeps the robot and the goal to taps", async () => {
    const { game } = await building();
    await tap(game, targetOf(game, "tool", "goal"));
    expect(game.state.build.tool).toBe("goal");
    drag(game, [0, 1, 2]);
    expect(game.state.build.level.cells.indexOf("G")).toBe(0);
  });

  it("shakes a tile it cannot paint, and says so with a soft sound", async () => {
    const { game, sound } = await building();
    await tap(game, targetOf(game, "cell", 30));
    expect(game.state.build.level.cells[30]).toBe(".");
    expect(game.state.moments.some((moment) => moment.kind === "shake" && moment.cell === 30)).toBe(true);
    expect(played(sound)).toContain("error-soft");
  });

  it("paints from the labelled buttons too, for a keyboard or a screen reader", async () => {
    const { game } = await building();
    game.press(targetOf(game, "cell", 20));
    expect(game.state.build.level.cells[20]).toBe("#");
  });
});

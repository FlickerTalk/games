import { describe, expect, it } from "vitest";
import { makeGame, tap, targetOf } from "./harness.js";

async function practising() {
  const made = await makeGame({ opening: { chat: undefined } });
  await tap(made.game, targetOf(made.game, "play"));
  await made.later(600);
  return made;
}

describe("touching the battlefield", () => {
  it("raises a dial when its top half is tapped and lowers it from the bottom half", async () => {
    const { game } = await practising();
    const angle = targetOf(game, "angle");
    await tap(game, { ...angle, h: angle.h / 2 });
    expect(game.state.round.aim.angle).toBe(50);
    await tap(game, { ...angle, y: angle.y + angle.h / 2, h: angle.h / 2 });
    expect(game.state.round.aim.angle).toBe(45);
  });

  it("lets a short pull go without shooting, and a slide off the screen without shooting either", async () => {
    const { game } = await practising();
    const [x, y] = game.anchorOnScreen();
    game.pointer({ type: "down", x: x - 4, y: y + 4 });
    game.pointer({ type: "up", x: x - 6, y: y + 6 });
    expect(game.state.round.moves).toHaveLength(1);
    game.pointer({ type: "down", x: x - 4, y: y + 4 });
    game.pointer({ type: "move", x: x - 80, y: y + 40 });
    game.pointer({ type: "cancel", x: x - 80, y: y + 40 });
    expect(game.state.round.pull).toBeNull();
    expect(game.state.round.moves).toHaveLength(1);
  });

  it("does not pull while the ball is still flying", async () => {
    const { game } = await practising();
    await tap(game, targetOf(game, "fire"));
    const [x, y] = game.anchorOnScreen();
    game.pointer({ type: "down", x: x - 4, y: y + 4 });
    expect(game.state.round.pull).toBeNull();
  });
});

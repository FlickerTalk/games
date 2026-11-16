import { describe, expect, it } from "vitest";
import { TALL, WIDE, wrapped } from "../src/arena.js";
import { pointOf } from "../src/layout.js";
import { COUNTDOWN } from "../src/rounds.js";
import { TURN_STEPS } from "../src/touch.js";
import { makeGame, press, targetOf } from "./harness.js";

async function playing(options = {}) {
  const made = await makeGame({ opening: { solo: true }, ...options });
  await press(made.game, "play");
  made.game.state.round.mind = null;
  await made.later(COUNTDOWN + 50);
  return made;
}

const mine = (game) => game.state.round.match.crafts[game.state.round.seat];

function fingerAt(game, type, x, y, id = 4) {
  const [px, py] = pointOf(game.state.layout, x, y);
  game.pointer({ type, x: px, y: py, id });
}

describe("steering with one finger", () => {
  it("turns the player's aircraft toward a finger held anywhere in the sky, and follows it as it moves", async () => {
    for (const size of [{}, { width: 360, height: 343, fill: false }]) {
      const { game, later } = await playing(size);
      const craft = mine(game);
      const [x, y] = [wrapped(craft.x, WIDE), wrapped(craft.y, TALL)];
      fingerAt(game, "down", x + 0.3, y);
      await later(300);
      expect(craft.down).toBe(true);
      expect(craft.hx).toBeGreaterThan(0.3);
      fingerAt(game, "move", wrapped(craft.x, WIDE) - 0.2, wrapped(craft.y, TALL));
      await later(900);
      expect(craft.hx).toBeLessThan(0);
    }
  });

  it("flies straight on when the finger lifts, and has taught the gesture by then", async () => {
    const { game, later, store } = await playing();
    const craft = mine(game);
    expect(game.state.taught).toBe(false);
    fingerAt(game, "down", 0.6, 1);
    await later(200);
    fingerAt(game, "up", 0.6, 1);
    expect(craft.down).toBe(false);
    const heading = [craft.hx, craft.hy];
    await later(300);
    expect([craft.hx, craft.hy]).toEqual(heading);
    expect(game.state.taught).toBe(true);
    expect(JSON.parse(store.kept.get("skychase")).taught).toBe(true);
  });

  it("keeps steering with the first finger when a second one lands, until the last one lifts", async () => {
    const { game, later } = await playing();
    const craft = mine(game);
    fingerAt(game, "down", 0.6, 1, 1);
    fingerAt(game, "down", 0.1, 0.2, 2);
    fingerAt(game, "up", 0.6, 1, 1);
    await later(50);
    expect(craft.down).toBe(true);
    fingerAt(game, "up", 0.1, 0.2, 2);
    expect(craft.down).toBe(false);
  });

  it("does not steer from a touch on the bar: that is the pause", async () => {
    const { game } = await playing();
    const pause = targetOf(game, "pause");
    game.pointer({ type: "down", x: pause.x + 5, y: pause.y + 5, id: 1 });
    expect(mine(game).down).toBe(false);
    game.pointer({ type: "up", x: pause.x + 5, y: pause.y + 5, id: 1 });
    expect(game.state.paused).toBe(true);
  });

  it("turns for a moment from the labelled buttons, for a keyboard or a screen reader", async () => {
    const { game, later } = await playing();
    const craft = mine(game);
    game.press(targetOf(game, "steer", "right"));
    await later(200);
    expect(craft.hx).toBeGreaterThan(0.2);
    await later((TURN_STEPS * 1000) / 120);
    expect(craft.down).toBe(false);
    const turned = craft.hx;
    game.press(targetOf(game, "steer", "left"));
    await later(300);
    expect(craft.hx).toBeLessThan(turned);
    expect(game.state.taught).toBe(true);
  });

  it("starts steering from a touch on the sky where a turn button sits", async () => {
    const { game, later } = await playing();
    const turn = targetOf(game, "steer", "right");
    game.pointer({ type: "down", x: turn.x + 40, y: turn.y + 40, id: 1 });
    await later(50);
    expect(mine(game).down).toBe(true);
  });
});

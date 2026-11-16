import { describe, expect, it } from "vitest";
import { fitting, makeGame, settled, tap, targetOf } from "./harness.js";

const centre = (area) => ({ x: area.x + area.w / 2, y: area.y + area.h / 2 });

describe("a finger on the play screen", () => {
  it("hits the moment it lands on a divisor, shows the button pressed until it lifts, and hits once", async () => {
    const { game, later } = await makeGame();
    await tap(game, targetOf(game, "play"));
    await settled(game, later);
    const divisor = fitting(game)[0];
    const point = centre(targetOf(game, "hit", divisor));
    game.pointer({ type: "down", ...point, id: 1 });
    expect(game.state.round.hits).toEqual([divisor]);
    expect(game.state.press).toEqual({ kind: "hit", value: divisor });
    game.pointer({ type: "up", ...point, id: 1 });
    expect(game.state.press).toBeNull();
    expect(game.state.round.hits).toEqual([divisor]);
  });

  it("presses the other controls when it lifts on them, and nothing when it slides away", async () => {
    const { game } = await makeGame();
    await tap(game, targetOf(game, "play"));
    const pause = centre(targetOf(game, "pause"));
    game.pointer({ type: "down", ...pause });
    expect(game.state.paused).toBe(false);
    game.pointer({ type: "up", x: pause.x, y: pause.y + 300 });
    expect(game.state.paused).toBe(false);
    game.pointer({ type: "down", ...pause });
    game.pointer({ type: "up", ...pause });
    expect(game.state.paused).toBe(true);
  });

  it("does not reach the divisors under the pause", async () => {
    const { game, later } = await makeGame();
    await tap(game, targetOf(game, "play"));
    await settled(game, later);
    const point = centre(targetOf(game, "hit", fitting(game)[0]));
    await tap(game, targetOf(game, "pause"));
    game.pointer({ type: "down", ...point });
    game.pointer({ type: "up", ...point });
    expect(game.state.round.hits).toEqual([]);
  });

  it("picks the player's face with two taps on the pick screen and keeps it", async () => {
    const { game, store } = await makeGame();
    await tap(game, targetOf(game, "avatar"));
    const profile = game.targets().filter((one) => one.kind === "profile")[3];
    await tap(game, profile);
    expect(game.state.pick.step).toBe("look");
    await tap(game, targetOf(game, "done"));
    expect(game.state.screen).toBe("home");
    expect(game.state.player.who).toBe(profile.value);
    expect(JSON.parse(store.kept.get("player")).who).toBe(profile.value);
  });
});

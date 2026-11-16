import { describe, expect, it } from "vitest";
import { makeGame, tap, targetOf } from "./harness.js";

describe("the menus", () => {
  it("open the pick screen for the player's face and come back home with it", async () => {
    const { game } = await makeGame();
    await tap(game, targetOf(game, "avatar"));
    expect(game.state.screen).toBe("avatar");
    await tap(game, targetOf(game, "profile", "ari"));
    await tap(game, targetOf(game, "done"));
    expect(game.state.screen).toBe("home");
    expect(game.state.player.who).toBe("ari");
  });

  it("pause a round and go home from it, keeping it to go on later", async () => {
    const { game, later } = await makeGame({ opening: { solo: true } });
    await tap(game, targetOf(game, "play"));
    await later(300);
    await tap(game, targetOf(game, "pause"));
    expect(game.state.paused).toBe(true);
    expect(game.resting()).toBe(true);
    await tap(game, targetOf(game, "home"));
    expect(game.state.screen).toBe("home");
    expect(game.state.resume.moves.length).toBeGreaterThan(0);
  });

  it("unfold the volume line from the speaker, and switch the music", async () => {
    const { game } = await makeGame();
    await tap(game, targetOf(game, "speaker"));
    expect(game.state.sound.open).toBe(true);
    expect(targetOf(game, "volume")).toBeDefined();
    await tap(game, targetOf(game, "music"));
    expect(game.sound.set).toHaveBeenCalled();
  });
});

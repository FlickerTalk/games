import { describe, expect, it } from "vitest";
import { makeGame, tap, targetOf } from "./harness.js";

describe("touches on the court", () => {
  it("lift nothing from an empty slot or once the round is over", async () => {
    const { game } = await makeGame();
    await tap(game, targetOf(game, "play"));
    game.state.round = { ...game.state.round, slots: [null, "square", "single"] };
    const zone = game.state.layout.slots[0];
    game.pointer({ type: "down", x: zone.x + 10, y: zone.y + 10 });
    expect(game.state.drag.phase).toBe("idle");
    game.state.round = { ...game.state.round, over: "full" };
    const full = game.state.layout.slots[1];
    game.pointer({ type: "down", x: full.x + 10, y: full.y + 10 });
    expect(game.state.drag.phase).toBe("idle");
  });

  it("follow one finger only while a piece is carried", async () => {
    const { game } = await makeGame();
    await tap(game, targetOf(game, "play"));
    const zone = game.state.layout.slots[1];
    game.pointer({ type: "down", x: zone.x + 10, y: zone.y + 10, id: 1 });
    game.pointer({ type: "down", x: 5, y: 5, id: 2 });
    expect(game.state.drag).toMatchObject({ phase: "lifted", slot: 1 });
    game.pointer({ type: "cancel", x: 5, y: 5, id: 1 });
    expect(game.state.drag.phase).toBe("idle");
    expect(game.state.moments.some((moment) => moment.kind === "bounce")).toBe(true);
  });

  it("pause the round with the pause button and go on with the big play button", async () => {
    const { game, sound } = await makeGame();
    await tap(game, targetOf(game, "play"));
    await tap(game, targetOf(game, "pause"));
    expect(game.state.paused).toBe(true);
    expect(sound.pause).toHaveBeenLastCalledWith(true);
    await tap(game, targetOf(game, "resume"));
    expect(game.state.paused).toBe(false);
    expect(sound.pause).toHaveBeenLastCalledWith(false);
  });

  it("fold the volume line after a few seconds untouched", async () => {
    const { game, later } = await makeGame();
    await tap(game, targetOf(game, "play"));
    await tap(game, targetOf(game, "speaker"));
    expect(game.state.sound.open).toBe(true);
    await later(3500);
    expect(game.state.sound.open).toBe(false);
  });

  it("let the drawing rest while the round is paused, and wake it when it goes on", async () => {
    const { game } = await makeGame();
    await tap(game, targetOf(game, "play"));
    expect(game.resting()).toBe(false);
    await tap(game, targetOf(game, "pause"));
    expect(game.resting()).toBe(true);
    await tap(game, targetOf(game, "resume"));
    expect(game.resting()).toBe(false);
  });
});

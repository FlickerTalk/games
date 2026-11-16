import { describe, expect, it } from "vitest";
import { LOOKS } from "../src/levels.js";
import { makeGame, memoryStore, played, tap, targetOf, until } from "./harness.js";

describe("the menus", () => {
  it("remember the way of playing the player picked", async () => {
    const store = memoryStore();
    const { game } = await makeGame({ store });
    expect(game.state.variant).toBe("levels");
    await tap(game, targetOf(game, "variant", "make"));
    expect((await makeGame({ store })).game.state.variant).toBe("make");
  });

  it("show the engines and the stations, let the player take one they own, and shake a wrapped one", async () => {
    const { game, store } = await makeGame();
    await tap(game, targetOf(game, "looks"));
    expect(game.state.screen).toBe("looks");
    expect(game.targets().filter((one) => one.kind === "look")).toHaveLength(LOOKS.engine.length);
    await tap(game, targetOf(game, "look", 2));
    expect(game.state.progress.chosen.engine).toBe("caterpillar");
    await tap(game, targetOf(game, "look", 5));
    expect(game.state.progress.chosen.engine).toBe("caterpillar");
    expect(game.state.moments.some((moment) => moment.kind === "shake" && moment.index === 5)).toBe(true);
    await tap(game, targetOf(game, "tab", "scenery"));
    expect(game.targets().filter((one) => one.kind === "look")).toHaveLength(LOOKS.scenery.length);
    await tap(game, targetOf(game, "done"));
    expect(game.state.screen).toBe("home");
    expect(JSON.parse(store.kept.get("progress")).chosen.engine).toBe("caterpillar");
  });

  it("open the kit's pick screen for the player's face and name", async () => {
    const { game } = await makeGame();
    await tap(game, targetOf(game, "avatar"));
    expect(game.state.screen).toBe("avatar");
    expect(game.targets().length).toBeGreaterThan(6);
  });

  it("pause a round without a sound from the train, and go on from where it was", async () => {
    const made = await makeGame();
    const { game, sound } = made;
    await tap(game, targetOf(game, "play"));
    await until(made, (state) => state.round.phase === "solve");
    await tap(game, targetOf(game, "pause"));
    expect(game.resting()).toBe(true);
    expect(game.targets().map((one) => one.kind).sort()).toEqual(["home", "resume"]);
    expect(sound.pause).toHaveBeenLastCalledWith(true);
    await tap(game, targetOf(game, "resume"));
    expect(game.state.paused).toBe(false);
    expect(game.state.round.phase).toBe("solve");
  });

  it("tell the composer by the send button whether the train can go, and change the beats of the next wagon", async () => {
    const { game, sound } = await makeGame({ opening: { solo: true } });
    await tap(game, targetOf(game, "variant", "make"));
    await tap(game, targetOf(game, "play"));
    expect(game.state.build.check.ok).toBe(false);
    for (const kind of [3, 4, 3, 4]) await tap(game, targetOf(game, "wagon", kind));
    await tap(game, targetOf(game, "slot", 0));
    expect(game.state.build.check).toEqual({ ok: true, why: null });
    await tap(game, targetOf(game, "slot", 0));
    expect(game.state.build.check.ok).toBe(false);
    await tap(game, targetOf(game, "dots"));
    expect(game.state.build.beats).toBe(2);
    for (let more = 0; more < 6; more += 1) await tap(game, targetOf(game, "wagon", 1));
    expect(game.state.build.wagons).toHaveLength(7);
    expect(played(sound).at(-1)).toBe("error-soft");
  });
});

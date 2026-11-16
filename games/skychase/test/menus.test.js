import { describe, expect, it } from "vitest";
import { COLOURS } from "../src/levels.js";
import { makeGame, memoryStore, press } from "./harness.js";

describe("the buttons around the round", () => {
  it("open and fold the volume line, and switch the music", async () => {
    const { game, sound } = await makeGame({ opening: { solo: true } });
    await press(game, "speaker");
    expect(game.state.sound.open).toBe(true);
    await press(game, "music");
    expect(sound.set).toHaveBeenCalledWith(expect.objectContaining({ music: false }));
  });

  it("let the player choose a plane or a helicopter to fly, the last one touched being the one flown, and remember it", async () => {
    const store = memoryStore();
    const { game } = await makeGame({ opening: { solo: true }, store });
    expect(game.state).toMatchObject({ flying: "plane", colour: COLOURS[0] });
    await press(game, "looks");
    expect(game.state).toMatchObject({ screen: "looks", looks: "plane" });
    await press(game, "look", 2);
    expect(game.state.progress.chosen.plane).toBe("jet");
    await press(game, "tab", "helicopter");
    expect(game.state.flying).toBe("plane");
    await press(game, "look", 1);
    expect(game.state).toMatchObject({ flying: "helicopter", colour: COLOURS[0] });
    expect(game.state.progress.chosen).toEqual({ plane: "jet", helicopter: "tandem" });
    await game.idle();
    expect(JSON.parse(store.kept.get("skychase"))).toMatchObject({ flying: "helicopter" });
    const again = await makeGame({ opening: { solo: true }, store });
    expect(again.game.state.flying).toBe("helicopter");
    await press(again.game, "looks");
    expect(again.game.state.looks).toBe("helicopter");
  });

  it("change the colour of the aircraft flown when it is touched again, round the five colours", async () => {
    const { game, store } = await makeGame({ opening: { solo: true } });
    await press(game, "looks");
    const seen = [];
    for (let at = 0; at < COLOURS.length; at += 1) {
      await press(game, "look", 0);
      seen.push(game.state.colour);
    }
    expect(seen).toEqual([...COLOURS.slice(1), COLOURS[0]]);
    await press(game, "look", 0);
    expect(JSON.parse(store.kept.get("skychase")).colour).toBe(COLOURS[1]);
    expect(game.state.progress.chosen.plane).toBe("propeller");
  });

  it("shake a wrapped aircraft without taking it", async () => {
    const { game } = await makeGame({ opening: { solo: true } });
    await press(game, "looks");
    await press(game, "look", 4);
    expect(game.state.progress.chosen.plane).toBe("propeller");
    expect(game.state.moments.some((one) => one.kind === "shake")).toBe(true);
    await press(game, "done");
    expect(game.state.screen).toBe("home");
  });
});

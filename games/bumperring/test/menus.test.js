import { describe, expect, it } from "vitest";
import { makeGame, press } from "./harness.js";

describe("the buttons around the round", () => {
  it("remember which way the player last played alone", async () => {
    const { game, store } = await makeGame({ opening: { chat: undefined } });
    await press(game, "variant", "pair");
    expect(game.state.variant).toBe("pair");
    expect(JSON.parse(store.kept.get("bumperring")).variant).toBe("pair");
  });

  it("open and fold the volume line, and switch the music", async () => {
    const { game, sound } = await makeGame({ opening: { solo: true } });
    await press(game, "speaker");
    expect(game.state.sound.open).toBe(true);
    await press(game, "music");
    expect(sound.set).toHaveBeenCalledWith(expect.objectContaining({ music: false }));
  });
});

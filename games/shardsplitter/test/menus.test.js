import { describe, expect, it } from "vitest";
import { makeGame, tap, targetOf } from "./harness.js";

describe("the home screen", () => {
  it("has one big play button, the player's face and the looks, and a seat for the teammate in a conversation", async () => {
    const { game } = await makeGame();
    expect(game.targets().map((one) => one.kind).sort()).toEqual(["avatar", "looks", "music", "play", "speaker"]);
    const team = await makeGame({ opening: { solo: true } });
    expect(team.game.targets().some((one) => one.kind === "rival")).toBe(true);
  });

  it("opens the player's face and the mallets and places to choose from", async () => {
    const { game } = await makeGame();
    await tap(game, targetOf(game, "avatar"));
    expect(game.state.screen).toBe("avatar");
    const other = await makeGame();
    await tap(other.game, targetOf(other.game, "looks"));
    expect(other.game.state.screen).toBe("looks");
    expect(other.game.targets().filter((one) => one.kind === "tab").map((one) => one.value)).toEqual(["mallet", "place"]);
  });
});

describe("the looks", () => {
  it("lets the player pick only what they own, shakes a wrapped one, and keeps the choice", async () => {
    const { game, store } = await makeGame();
    await tap(game, targetOf(game, "looks"));
    await tap(game, targetOf(game, "look", 1));
    expect(game.state.progress.chosen.mallet).toBe("block");
    expect(game.state.moments.some((moment) => moment.kind === "shake" && moment.index === 1)).toBe(true);
    game.state.progress = { ...game.state.progress, received: ["round"] };
    await tap(game, targetOf(game, "look", 1));
    expect(game.state.progress.chosen.mallet).toBe("round");
    expect(JSON.parse(store.kept.get("progress")).chosen.mallet).toBe("round");
    await tap(game, targetOf(game, "tab", "place"));
    expect(game.targets().filter((one) => one.kind === "look")).toHaveLength(3);
    await tap(game, targetOf(game, "done"));
    expect(game.state.screen).toBe("home");
  });
});

describe("the pause", () => {
  it("stops the round and the sound, and goes on from the same place", async () => {
    const { game, sound, later } = await makeGame();
    await tap(game, targetOf(game, "play"));
    await later(1000);
    await tap(game, targetOf(game, "pause"));
    expect(game.state.paused).toBe(true);
    expect(sound.pause).toHaveBeenLastCalledWith(true);
    expect(game.targets().map((one) => one.kind).sort()).toEqual(["home", "resume"]);
    await tap(game, targetOf(game, "resume"));
    expect(game.state.paused).toBe(false);
    expect(sound.pause).toHaveBeenLastCalledWith(false);
  });
});

describe("the player's name", () => {
  it("is typed into the pick screen's field", async () => {
    const { game } = await makeGame();
    await tap(game, targetOf(game, "avatar"));
    game.rename("Noa");
    expect(game.state.pick.choice.name).toBe("Noa");
  });
});

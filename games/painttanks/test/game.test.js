import { afterEach, describe, expect, it, vi } from "vitest";
import { checkTargets, leastFor } from "../../../kit/test/canvas/sizes.js";
import { makeGame, memoryStore, tap, targetOf } from "./harness.js";

afterEach(() => vi.restoreAllMocks());

const least = (target) => (["pause", "profile", "hair", "colour", "name", "next", "back", "tab"].includes(target.kind) ? 48 : leastFor(target));

describe("opening the game", () => {
  it("shows the home screen, says nothing on the live channel, and plays target practice outside a conversation", async () => {
    const { game, core } = await makeGame({ opening: { chat: undefined, live: true } });
    expect(game.state.screen).toBe("home");
    expect(game.state.mode).toBe("alone");
    expect(targetOf(game, "rival")).toBeUndefined();
    expect(core.ft.live.send).not.toHaveBeenCalled();
  });

  it("plays against Flick in the FlickerTalk conversation and with the friend in a contact's", async () => {
    expect((await makeGame({ opening: { solo: true } })).game.state.mode).toBe("flick");
    expect((await makeGame({ opening: { live: true } })).game.state.mode).toBe("friend");
  });

  it("offers the four battlefields, and keeps the one chosen", async () => {
    const store = memoryStore();
    const { game } = await makeGame({ store });
    expect(game.targets().filter((one) => one.kind === "variant").map((one) => one.value)).toEqual(["land", "sea", "coast", "deep"]);
    await tap(game, targetOf(game, "variant", "coast"));
    await game.idle();
    const again = await makeGame({ store });
    expect(again.game.state.variant).toBe("coast");
  });
});

describe("the looks", () => {
  it("show the four kinds, then a kind's looks, letting the player wear only what they own", async () => {
    const { game } = await makeGame();
    await tap(game, targetOf(game, "looks"));
    expect(game.state.screen).toBe("looks");
    expect(game.targets().filter((one) => one.kind === "look")).toHaveLength(4);
    await tap(game, targetOf(game, "look", 0));
    expect(game.state.looks).toBe("tank");
    expect(game.targets().filter((one) => one.kind === "look")).toHaveLength(6);
    await tap(game, targetOf(game, "look", 1));
    expect(game.state.progress.chosen.tank).toBe("long");
    await tap(game, targetOf(game, "look", 4));
    expect(game.state.progress.chosen.tank).toBe("long");
    await tap(game, targetOf(game, "done"));
    expect(game.state.looks).toBeNull();
    await tap(game, targetOf(game, "done"));
    expect(game.state.screen).toBe("home");
  });
});

describe("every screen", () => {
  it("keeps what it lets the player touch inside the frame and apart, at every size", async () => {
    for (const [width, height, fill] of [[360, 588, true], [384, 801, true], [844, 338, true], [1280, 748, true], [360, 343, false], [384, 556, false]]) {
      const { game, later } = await makeGame({ opening: { solo: true }, width, height, fill });
      const look = (name) => checkTargets(game.targets(), { width, height, fill, least, name: `${name} ${width}x${height}` });
      look("home");
      await tap(game, targetOf(game, "looks"));
      look("looks");
      await tap(game, targetOf(game, "look", 2));
      look("submarines");
      await tap(game, targetOf(game, "done"));
      await tap(game, targetOf(game, "done"));
      await tap(game, targetOf(game, "play"));
      await later(300);
      look("play");
      await tap(game, targetOf(game, "pause"));
      look("pause");
    }
  }, 60_000);
});

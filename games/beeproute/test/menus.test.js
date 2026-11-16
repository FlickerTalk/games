import { describe, expect, it } from "vitest";
import { PROGRESS } from "../src/levels.js";
import { makeGame, memoryStore, tap, targetOf, type } from "./harness.js";

describe("the home screen", () => {
  it("offers the levels and making a level, remembers the choice, and starts it with the big play button", async () => {
    const store = memoryStore();
    const { game } = await makeGame({ store });
    expect(game.targets().filter((one) => one.kind === "variant").map((one) => one.value)).toEqual(["levels", "make"]);
    await tap(game, targetOf(game, "variant", "make"));
    expect(game.state.variant).toBe("make");
    const again = await makeGame({ store });
    expect(again.game.state.variant).toBe("make");
    await tap(again.game, targetOf(again.game, "play"));
    expect(again.game.state.screen).toBe("build");
  });

  it("opens the player's face and the robots and worlds to choose from", async () => {
    const { game } = await makeGame();
    await tap(game, targetOf(game, "avatar"));
    expect(game.state.screen).toBe("avatar");
    const other = await makeGame();
    await tap(other.game, targetOf(other.game, "looks"));
    expect(other.game.state.screen).toBe("looks");
    expect(other.game.targets().filter((one) => one.kind === "tab").map((one) => one.value)).toEqual(["robot", "world"]);
  });
});

describe("the looks", () => {
  it("lets the player pick a robot they own, and shakes a wrapped one", async () => {
    const { game } = await makeGame();
    await tap(game, targetOf(game, "looks"));
    await tap(game, targetOf(game, "look", 2));
    expect(game.state.progress.chosen.robot).toBe("wide");
    await tap(game, targetOf(game, "look", 5));
    expect(game.state.progress.chosen.robot).toBe("wide");
    expect(game.state.moments.some((moment) => moment.kind === "shake" && moment.index === 5)).toBe(true);
    await tap(game, targetOf(game, "tab", "world"));
    expect(game.targets().filter((one) => one.kind === "look")).toHaveLength(3);
    await tap(game, targetOf(game, "done"));
    expect(game.state.screen).toBe("home");
  });

  it("hands the gift over on the star screen, wrapped until it is opened", async () => {
    const won = PROGRESS.awardRound(PROGRESS.fresh(), { won: true, score: 100 }).record;
    const { game, later } = await makeGame({ store: memoryStore({ progress: JSON.stringify(won) }) });
    await tap(game, targetOf(game, "play"));
    const { shortest } = await import("../src/solver.js");
    await type(game, shortest(game.state.round.level));
    await tap(game, targetOf(game, "play"));
    await later(30_000, 100);
    expect(game.state.outcome.gift).toBe("garden");
    expect(targetOf(game, "gift")).toBeDefined();
    await tap(game, targetOf(game, "gift"));
    expect(game.state.outcome.opened).toBe(true);
    expect(game.state.progress.chosen.world).toBe("garden");
  });
});

describe("the pause", () => {
  it("stops a run, and goes on or home from there", async () => {
    const { game } = await makeGame();
    await tap(game, targetOf(game, "play"));
    await type(game, ["F"]);
    await tap(game, targetOf(game, "play"));
    await tap(game, targetOf(game, "pause"));
    expect(game.state.paused).toBe(true);
    expect(game.state.round.run).toBeNull();
    expect(game.resting()).toBe(true);
    await tap(game, targetOf(game, "resume"));
    expect(game.state.paused).toBe(false);
  });
});

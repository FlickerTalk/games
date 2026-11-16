import { describe, expect, it } from "vitest";
import { makeGame, memoryStore, playRound, tap, targetOf } from "./harness.js";

describe("the home screen", () => {
  it("remembers the court the player chose", async () => {
    const store = memoryStore();
    const { game } = await makeGame({ store });
    await tap(game, targetOf(game, "variant", "big"));
    expect(game.state.variant).toBe("big");
    expect(JSON.parse(store.kept.get("tilecourt")).variant).toBe("big");
  });

  it("opens the kit's pick screen from the player's face, and keeps the new choice", async () => {
    const store = memoryStore();
    const { game, asked } = await makeGame({ store });
    await tap(game, targetOf(game, "avatar"));
    expect(game.state.screen).toBe("avatar");
    await tap(game, targetOf(game, "profile", "juno"));
    await tap(game, targetOf(game, "rename"));
    expect(asked).toEqual(["rename"]);
    game.rename("Ana");
    await tap(game, targetOf(game, "done"));
    expect(game.state.screen).toBe("home");
    expect(JSON.parse(store.kept.get("player"))).toMatchObject({ who: "juno", name: "Ana" });
  });
});

describe("the looks", () => {
  it("let the player choose an owned courtyard, and only shake a wrapped one", async () => {
    const store = memoryStore();
    const { game } = await makeGame({ store });
    await tap(game, targetOf(game, "looks"));
    expect(game.state.screen).toBe("looks");
    await tap(game, targetOf(game, "look", 1));
    expect(game.state.progress.chosen.court).toBe("patio");
    expect(game.state.moments.some((moment) => moment.kind === "shake")).toBe(true);
    await tap(game, targetOf(game, "tab", "effect"));
    await tap(game, targetOf(game, "look", 1));
    expect(game.state.progress.chosen.effect).toBe("birds");
    expect(JSON.parse(store.kept.get("progress")).chosen.effect).toBe("birds");
    await tap(game, targetOf(game, "done"));
    expect(game.state.screen).toBe("home");
  });
});

describe("the end of a round", () => {
  it("hands over a wrapped gift that opens on a touch and becomes the chosen look of its kind", async () => {
    const store = memoryStore({ progress: JSON.stringify({ v: 1, level: 2, losses: 0, wins: 1, best: null, received: [], chosen: { effect: "lanterns", court: "patio" } }) });
    const { game, later } = await makeGame({ store });
    await tap(game, targetOf(game, "variant", "small"));
    await tap(game, targetOf(game, "play"));
    await playRound(game, later);
    expect(game.state.outcome.gift).toBe("leaves");
    expect(targetOf(game, "gift")).toBeDefined();
    await tap(game, targetOf(game, "gift"));
    expect(game.state.outcome.opened).toBe(true);
    expect(game.state.progress.chosen.effect).toBe("leaves");
    expect(targetOf(game, "gift")).toBeUndefined();
  });

  it("goes home with the home button", async () => {
    const { game, later } = await makeGame();
    await tap(game, targetOf(game, "variant", "small"));
    await tap(game, targetOf(game, "play"));
    await playRound(game, later);
    await tap(game, targetOf(game, "home"));
    expect(game.state.screen).toBe("home");
  });
});

describe("the friend's seat", () => {
  it("calls the friend again from their seat when they are not here", async () => {
    const { game, core } = await makeGame({ opening: { live: true } });
    await tap(game, targetOf(game, "play"));
    const before = core.sent.length;
    await tap(game, targetOf(game, "pause"));
    await tap(game, targetOf(game, "home"));
    await tap(game, targetOf(game, "rival"));
    expect(core.sent.length).toBeGreaterThan(before);
  });
});

import { describe, expect, it } from "vitest";
import { fakeCore } from "../../../kit/test/helpers.js";
import { COUNTDOWN } from "../src/rounds.js";
import { beatHabit, choose, makeGame, press, targetOf } from "./harness.js";

const kinds = (game) => game.targets().map((one) => one.kind);

describe("the game", () => {
  it("opens on its home screen: Flick's seat against FlickerTalk, the other person's in a chat, two ways to play alone", async () => {
    const flick = await makeGame({ opening: { solo: true } });
    expect(flick.game.state).toMatchObject({ screen: "home", mode: "flick" });
    expect(kinds(flick.game)).toEqual(expect.arrayContaining(["play", "avatar", "looks", "rival", "speaker", "music"]));
    const friend = await makeGame({ opening: { live: true } });
    expect(friend.game.state.mode).toBe("friend");
    expect(kinds(friend.game)).toContain("rival");
    const alone = await makeGame({ opening: { chat: undefined } });
    expect(alone.game.state.mode).toBe("alone");
    expect(alone.game.targets().filter((one) => one.kind === "variant").map((one) => one.value)).toEqual(["flick", "pair"]);
  });

  it("never starts a round by itself, and counts down before the first window opens", async () => {
    const { game, later } = await makeGame({ opening: { solo: true } });
    await later(5000);
    expect(game.state.screen).toBe("home");
    await press(game, "play");
    expect(game.state.screen).toBe("play");
    await later(COUNTDOWN - 200);
    expect(game.state.round.step).toBe(0);
    await later(600);
    expect(game.state.round.step).toBeGreaterThan(0);
  });

  it("lights the glove's button when tapped and plays it against Flick's move once the window closes", async () => {
    const { game, later } = await makeGame({ opening: { solo: true } });
    await press(game, "play");
    await later(COUNTDOWN + 300);
    choose(game, "g");
    expect(game.state.round.held[0]).toBe(1);
    expect(game.state.round.mine).toEqual([]);
    await later(game.state.round.settings.window);
    const { round } = game.state;
    expect(round.mine).toEqual(["g"]);
    expect(round.theirs).toHaveLength(1);
    expect(round.held[0]).toBe(0);
    expect(round.shown).toMatchObject({ index: 0, moves: ["g", round.theirs[0]] });
  });

  it("raises the shield with both buttons, goes back to one of them with another tap, and stops teaching once a button was used", async () => {
    const { game, later, store } = await makeGame({ opening: { solo: true } });
    await press(game, "play");
    await later(COUNTDOWN + 200);
    expect(game.state.taught).toBe(false);
    await press(game, "glove", 0);
    expect(game.state.round.held[0]).toBe(1);
    await press(game, "glove", 0);
    expect(game.state.round.held[0]).toBe(1);
    await press(game, "boot", 0);
    expect(game.state.round.held[0]).toBe(3);
    await press(game, "boot", 0);
    expect(game.state.round.held[0]).toBe(2);
    expect(game.state.taught).toBe(true);
    expect(JSON.parse(store.kept.get("robotrumble")).taught).toBe(true);
    await later(game.state.round.settings.window);
    expect(game.state.round.mine).toEqual(["b"]);
  });

  it("keeps a button tapped while the robots show their moves for the next window", async () => {
    const { game, later } = await makeGame({ opening: { solo: true } });
    await press(game, "play");
    await later(COUNTDOWN + game.state.round.settings.window + 200);
    expect(game.state.round.mine).toEqual(["n"]);
    choose(game, "b");
    await later(game.state.round.settings.period);
    expect(game.state.round.mine).toEqual(["n", "b"]);
  });

  it("plays a whole round against Flick to its star card, saves the progress, and never touches the live channel", { timeout: 60_000 }, async () => {
    const core = fakeCore();
    const { game, later, store } = await makeGame({ opening: { solo: true }, core });
    await press(game, "play");
    const { seconds } = game.state.round.settings;
    await later(COUNTDOWN + seconds * 1000 + 4000, { each: beatHabit });
    expect(game.state.screen).toBe("end");
    const { outcome } = game.state;
    expect(outcome.stars).toBeGreaterThanOrEqual(2);
    expect(outcome.mine).toBeGreaterThan(outcome.theirs);
    expect(outcome.won).toBe(true);
    expect(JSON.parse(store.kept.get("progress")).level).toBe(2);
    expect(core.ft.live.send).not.toHaveBeenCalled();
    expect(game.duel).toBeNull();
    await press(game, "again");
    expect(game.state.screen).toBe("play");
    expect(game.state.round.settings.level).toBe(2);
  });

  it("ends the round when the exchanges run out even if the player never touches a button", { timeout: 60_000 }, async () => {
    const { game, later } = await makeGame({ opening: { solo: true } });
    await press(game, "play");
    await later(COUNTDOWN + 35_000 + 4000);
    expect(game.state.screen).toBe("end");
    expect(game.state.outcome.mine).toBe(0);
    expect(game.state.outcome.stars).toBe(1);
  });

  it("stops the windows while paused, and leaves the round from the pause", async () => {
    const { game, later } = await makeGame({ opening: { solo: true } });
    await press(game, "play");
    await later(COUNTDOWN + 500);
    await press(game, "pause");
    const { step } = game.state.round;
    await later(2000);
    expect(game.state.round.step).toBe(step);
    expect(kinds(game)).toEqual(expect.arrayContaining(["resume", "home"]));
    await press(game, "resume");
    await later(500);
    expect(game.state.round.step).toBeGreaterThan(step);
    await press(game, "pause");
    await press(game, "home");
    expect(game.state).toMatchObject({ screen: "home", round: null });
  });

  it("lets two players share one device, each with a glove and a boot at their own side", async () => {
    const { game, later } = await makeGame({ opening: { chat: undefined }, width: 1280, height: 748 });
    await press(game, "variant", "pair");
    await press(game, "play");
    expect(game.state.round.kind).toBe("pair");
    expect(targetOf(game, "boot", 1)).toBeDefined();
    await later(COUNTDOWN + 200);
    choose(game, "g", 0);
    choose(game, "b", 1);
    await later(game.state.round.settings.window);
    const { round } = game.state;
    expect([round.mine, round.theirs]).toEqual([["g"], ["b"]]);
    expect(round.bout.hits).toEqual([1, 0]);
  });

  it("sounds the window opening and the hits", async () => {
    const { game, later, sound } = await makeGame({ opening: { solo: true } });
    await press(game, "play");
    await later(COUNTDOWN + 12_000, { each: beatHabit });
    const played = sound.play.mock.calls.map(([name]) => name);
    expect(played).toContain("tick");
    expect(played.some((name) => name === "boing" || name === "sproing" || name === "bounce")).toBe(true);
  });

  it("lets the player pick an owned robot and stage, and shakes a wrapped one without taking it", async () => {
    const { game, store } = await makeGame({ opening: { solo: true } });
    await press(game, "looks");
    expect(game.state.screen).toBe("looks");
    await press(game, "look", 2);
    expect(game.state.progress.chosen.robot).toBe("square");
    await press(game, "look", 4);
    expect(game.state.progress.chosen.robot).toBe("square");
    expect(game.state.moments.some((one) => one.kind === "shake")).toBe(true);
    await press(game, "tab", "stage");
    await press(game, "look", 2);
    expect(game.state.progress.chosen.stage).toBe("box");
    await game.idle();
    expect(JSON.parse(store.kept.get("progress")).chosen).toEqual({ robot: "square", stage: "box" });
    await press(game, "done");
    expect(game.state.screen).toBe("home");
  });

  it("opens the pick screen from the player's face", async () => {
    const { game } = await makeGame({ opening: { solo: true } });
    await press(game, "avatar");
    expect(game.state.screen).toBe("avatar");
    expect(targetOf(game, "profile")).toBeDefined();
  });
});

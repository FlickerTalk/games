import { describe, expect, it } from "vitest";
import { fakeCore } from "../../../kit/test/helpers.js";
import { START } from "../src/arena.js";
import { scoreOf } from "../src/match.js";
import { COUNTDOWN } from "../src/rounds.js";
import { finger, makeGame, playWell, press, targetOf } from "./harness.js";

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

  it("counts down before anyone moves, a finger held through it charging only once it starts", async () => {
    const { game, later } = await makeGame({ opening: { solo: true } });
    await press(game, "play");
    expect(game.state.screen).toBe("play");
    finger(game, "down");
    await later(COUNTDOWN - 200);
    const { match } = game.state.round;
    expect(match.step).toBe(0);
    expect(match.bodies[0]).toMatchObject({ x: START[0][0], y: START[0][1], hold: -1 });
    await later(600);
    expect(match.step).toBeGreaterThan(20);
    expect(match.bodies[0].hold).toBeGreaterThan(10);
  });

  it("dashes the player's own figure on a touch anywhere under the bar, harder after a hold, and teaches the gesture until it is done once", async () => {
    const { game, later, store, sound } = await makeGame({ opening: { solo: true } });
    await press(game, "play");
    await later(COUNTDOWN + 100);
    expect(game.state.taught).toBe(false);
    const me = game.state.round.match.bodies[0];
    game.pointer({ type: "down", x: 30, y: 300, id: 3 });
    await later(500);
    expect(me.hold).toBeGreaterThan(40);
    game.pointer({ type: "up", x: 30, y: 300, id: 3 });
    await later(60);
    expect(Math.hypot(me.vx, me.vy)).toBeGreaterThan(1.2);
    expect(game.state.taught).toBe(true);
    expect(JSON.parse(store.kept.get("bumperring")).taught).toBe(true);
    expect(sound.play.mock.calls.map(([name]) => name)).toContain("whoosh");
  });

  it("plays a whole round against Flick to its star card, saves the progress, and never touches the live channel", { timeout: 60_000 }, async () => {
    const core = fakeCore();
    const { game, later, store } = await makeGame({ opening: { solo: true }, core });
    await press(game, "play");
    expect(game.state.round.mind).not.toBeNull();
    await later(COUNTDOWN + 36_000, { each: playWell });
    await later(3000);
    expect(game.state.screen).toBe("end");
    const { outcome } = game.state;
    expect(outcome.stars).toBeGreaterThanOrEqual(1);
    expect(outcome.mine + outcome.theirs).toBeGreaterThan(0);
    expect(outcome.kind).toBe("flick");
    expect(JSON.parse(store.kept.get("progress")).level).toBe(outcome.won ? 2 : 1);
    expect(core.ft.live.send).not.toHaveBeenCalled();
    await press(game, "again");
    expect(game.state.screen).toBe("play");
    expect(game.state.round.match.step).toBe(0);
  });

  it("stops the round while paused, and leaves it from the pause", async () => {
    const { game, later } = await makeGame({ opening: { solo: true } });
    await press(game, "play");
    await later(COUNTDOWN + 500);
    await press(game, "pause");
    const step = game.state.round.match.step;
    await later(2000);
    expect(game.state.round.match.step).toBe(step);
    expect(kinds(game)).toEqual(expect.arrayContaining(["resume", "home"]));
    await press(game, "resume");
    await later(500);
    expect(game.state.round.match.step).toBeGreaterThan(step);
    await press(game, "pause");
    await press(game, "home");
    expect(game.state).toMatchObject({ screen: "home", round: null });
  });

  it("lets two players share one device, each with their own button and nobody played by the phone", async () => {
    const { game, later } = await makeGame({ opening: { chat: undefined }, width: 1280, height: 748 });
    await press(game, "variant", "pair");
    await press(game, "play");
    expect(game.state.round).toMatchObject({ kind: "pair", own: [true, true], mind: null });
    expect(targetOf(game, "dash", 1)).toBeDefined();
    await later(COUNTDOWN + 100);
    finger(game, "down", { slot: 1, id: 2 });
    finger(game, "down", { slot: 0, id: 1 });
    await later(300);
    const [near, far] = game.state.round.match.bodies;
    expect(near.hold).toBeGreaterThan(10);
    expect(far.hold).toBeGreaterThan(10);
    finger(game, "up", { slot: 1, id: 2 });
    await later(100);
    expect(far.vy).toBeGreaterThan(0.5);
    expect(near.hold).toBeGreaterThan(10);
  });

  it("dashes at once from the labelled button, for a keyboard or a screen reader", async () => {
    const { game, later } = await makeGame({ opening: { solo: true } });
    await press(game, "play");
    await later(COUNTDOWN + 100);
    game.press(targetOf(game, "dash", 0));
    await later(60);
    expect(game.state.round.match.bodies[0].vy).toBeLessThan(-0.5);
  });

  it("sounds the bumps and the falls, and keeps the points in the round", { timeout: 60_000 }, async () => {
    const { game, later, sound } = await makeGame({ opening: { solo: true }, seed: 21 });
    await press(game, "play");
    await later(COUNTDOWN + 30_000, { each: playWell });
    const played = sound.play.mock.calls.map(([name]) => name);
    expect(played).toContain("whoosh");
    expect(played).toContain("splash");
    const { match } = game.state.round;
    expect(scoreOf(match, 0) + scoreOf(match, 1)).toBeGreaterThan(0);
  });

  it("lets the player pick an owned place and ring, and shakes a wrapped one without taking it", async () => {
    const { game, store } = await makeGame({ opening: { solo: true } });
    await press(game, "looks");
    expect(game.state.screen).toBe("looks");
    await press(game, "look", 1);
    expect(game.state.progress.chosen.place).toBe("pool");
    await press(game, "look", 2);
    expect(game.state.progress.chosen.place).toBe("pool");
    expect(game.state.moments.some((one) => one.kind === "shake")).toBe(true);
    await press(game, "tab", "ring");
    await press(game, "look", 1);
    expect(game.state.progress.chosen.ring).toBe("aqua");
    await game.idle();
    expect(JSON.parse(store.kept.get("progress")).chosen).toEqual({ place: "pool", ring: "aqua" });
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

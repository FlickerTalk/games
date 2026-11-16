import { describe, expect, it } from "vitest";
import { fakeCore } from "../../../kit/test/helpers.js";
import { scoreOf } from "../src/match.js";
import { COUNTDOWN } from "../src/rounds.js";
import { fingerAt, follow, makeGame, press, targetOf } from "./harness.js";

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

  it("counts down before the ball moves, then plays against Flick, whose paddle goes after the ball", async () => {
    const { game, later } = await makeGame({ opening: { solo: true } });
    await press(game, "play");
    expect(game.state.screen).toBe("play");
    const served = { ...game.state.round.match.balls[0] };
    await later(COUNTDOWN - 200);
    expect(game.state.round.match.balls[0]).toMatchObject({ x: served.x, y: served.y });
    await later(2500);
    expect(game.state.round.match.step).toBeGreaterThan(200);
    expect(game.state.round.match.paddles[1].x).not.toBe(0.5);
  });

  it("plays a whole round against Flick to its star card, saves the progress, and never touches the live channel", { timeout: 60_000 }, async () => {
    const core = fakeCore();
    const { game, later, store } = await makeGame({ opening: { solo: true }, core });
    await press(game, "play");
    await later(COUNTDOWN + 40_000, { each: follow });
    await later(3000);
    expect(game.state.screen).toBe("end");
    const { outcome } = game.state;
    expect(outcome.stars).toBeGreaterThanOrEqual(1);
    expect(outcome.mine).toBeGreaterThan(outcome.theirs);
    expect(JSON.parse(store.kept.get("progress")).level).toBe(2);
    expect(core.ft.live.send).not.toHaveBeenCalled();
    await press(game, "again");
    expect(game.state.screen).toBe("play");
    expect(game.state.round.settings.level).toBe(2);
  });

  it("moves the player's paddle where the finger is on their half, and teaches the gesture until it is done once", async () => {
    const { game, later, store } = await makeGame({ opening: { solo: true } });
    await press(game, "play");
    expect(game.state.taught).toBe(false);
    fingerAt(game, 0.2, { type: "down" });
    fingerAt(game, 0.25);
    await later(800);
    expect(game.state.round.match.paddles[0].x).toBeCloseTo(0.25, 5);
    expect(game.state.taught).toBe(true);
    expect(JSON.parse(store.kept.get("paddlepop")).taught).toBe(true);
  });

  it("stops the match while paused, and leaves the round from the pause", async () => {
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

  it("lets two players share one device, each dragging on their own half", async () => {
    const { game, later } = await makeGame({ opening: { chat: undefined }, width: 1280, height: 748 });
    await press(game, "variant", "pair");
    await press(game, "play");
    expect(game.state.round).toMatchObject({ kind: "pair", own: [true, true] });
    fingerAt(game, 0.3, { type: "down", id: 1 });
    fingerAt(game, 0.7, { type: "down", id: 2, far: true });
    await later(1000);
    expect(game.state.round.match.paddles[0].x).toBeCloseTo(0.3, 5);
    expect(game.state.round.match.paddles[1].x).toBeCloseTo(0.7, 5);
  });

  it("sounds the hits and the goals, and keeps the score in the match", async () => {
    const { game, later, sound } = await makeGame({ opening: { solo: true } });
    await press(game, "play");
    await later(COUNTDOWN + 15_000);
    const played = sound.play.mock.calls.map(([name]) => name);
    expect(played).toContain("bounce");
    expect(played.some((name) => name === "splash" || name === "success")).toBe(true);
    const { match } = game.state.round;
    expect(scoreOf(match, 0) + scoreOf(match, 1)).toBeGreaterThan(0);
  });

  it("lets the player pick an owned paddle and table, and shakes a wrapped one without taking it", async () => {
    const { game, store } = await makeGame({ opening: { solo: true } });
    await press(game, "looks");
    expect(game.state.screen).toBe("looks");
    await press(game, "look", 2);
    expect(game.state.progress.chosen.paddle).toBe("dog");
    await press(game, "look", 4);
    expect(game.state.progress.chosen.paddle).toBe("dog");
    expect(game.state.moments.some((one) => one.kind === "shake")).toBe(true);
    await press(game, "tab", "table");
    await press(game, "look", 2);
    expect(game.state.progress.chosen.table).toBe("space");
    await game.idle();
    expect(JSON.parse(store.kept.get("progress")).chosen).toEqual({ paddle: "dog", table: "space" });
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

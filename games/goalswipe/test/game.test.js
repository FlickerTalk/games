import { describe, expect, it } from "vitest";
import { fakeCore } from "../../../kit/test/helpers.js";
import { snapAim } from "../src/kicks.js";
import { FLIGHT, RESULT } from "../src/moves.js";
import { THINK } from "../src/rounds.js";
import { overOf } from "../src/shootout.js";
import { makeGame, playWell, press, swipe, tapGoal, targetOf } from "./harness.js";

const kinds = (game) => game.targets().map((one) => one.kind);
const CORNER = snapAim({ x: 0.12, y: 0.25 });

describe("the game", () => {
  it("opens on its home screen: Flick's seat against FlickerTalk, the other person's in a chat, two ways to play outside one", async () => {
    const flick = await makeGame({ opening: { solo: true } });
    expect(flick.game.state).toMatchObject({ screen: "home", mode: "flick" });
    expect(kinds(flick.game)).toEqual(expect.arrayContaining(["play", "avatar", "looks", "rival", "speaker", "music"]));
    expect(kinds(flick.game)).not.toContain("variant");
    const friend = await makeGame({ opening: { live: true } });
    expect(friend.game.state.mode).toBe("friend");
    expect(kinds(friend.game)).toContain("rival");
    const alone = await makeGame({ opening: { chat: undefined } });
    expect(alone.game.state.mode).toBe("alone");
    expect(alone.game.targets().filter((one) => one.kind === "variant").map((one) => one.value)).toEqual(["flick", "pair"]);
  });

  it("starts a round only when asked, the player shooting first with the ball waiting on its spot", async () => {
    const { game, later } = await makeGame({ opening: { solo: true } });
    await later(3000);
    expect(game.state.screen).toBe("home");
    await press(game, "play");
    await later(50);
    expect(game.state.screen).toBe("play");
    expect(game.state.round).toMatchObject({ kind: "flick", seat: 0, kicks: [] });
    expect(game.state.round.kick).toMatchObject({ index: 0, shooter: 0, phase: "aim" });
    await later(5000);
    expect(game.state.round.kick.phase).toBe("aim");
    expect(kinds(game)).toEqual(["pause", "speaker", "music", "shoot", "shoot", "shoot"]);
  });

  it("shoots where the swipe from the ball points: Flick dives, the ball flies, and the kick is counted", async () => {
    const { game, later, sound } = await makeGame({ opening: { solo: true } });
    await press(game, "play");
    await later(50);
    swipe(game, CORNER);
    const { kick } = game.state.round;
    expect(kick).toMatchObject({ phase: "fly", aim: CORNER, ringAt: null });
    expect(kick.dive).not.toBeNull();
    expect(kick.trail.length).toBeGreaterThanOrEqual(3);
    await later(FLIGHT + 50);
    expect(kick.phase).toBe("result");
    expect(["goal", "saved"]).toContain(kick.outcome);
    await later(RESULT + 50);
    expect(game.state.round.kicks).toEqual([{ aim: CORNER, dive: kick.dive, outcome: kick.outcome, bonus: null }]);
    expect(sound.play.mock.calls.map(([name]) => name)).toEqual(expect.arrayContaining(["whoosh"]));
    expect(game.state.round.kick).toMatchObject({ index: 1, shooter: 1, phase: "think" });
  });

  it("ignores a swipe that does not start on the ball, and a tap on it", async () => {
    const { game, later } = await makeGame({ opening: { solo: true } });
    await press(game, "play");
    await later(50);
    const { ball } = game.state.layout;
    game.pointer({ type: "down", x: 20, y: ball.y - 200, id: 2 });
    game.pointer({ type: "up", x: 20, y: ball.y - 400, id: 2 });
    game.pointer({ type: "down", x: ball.x, y: ball.y, id: 2 });
    game.pointer({ type: "up", x: ball.x, y: ball.y, id: 2 });
    expect(game.state.round.kick.phase).toBe("aim");
  });

  it("warns with a ring where Flick's shot will go before the ball leaves, and saves it when the player taps there in time", async () => {
    const { game, later } = await makeGame({ opening: { solo: true } });
    await press(game, "play");
    await later(50);
    swipe(game, CORNER);
    await later(FLIGHT + RESULT + 100);
    await later(THINK + 50);
    const { kick } = game.state.round;
    expect(kick).toMatchObject({ shooter: 1, phase: "fly" });
    expect(kick.ringAt).not.toBeNull();
    expect(kick.flyAt - kick.ringAt).toBe(game.state.round.settings.warn);
    expect(kinds(game)).toContain("dive");
    kick.aim = snapAim({ x: 0.8, y: 0.3 });
    tapGoal(game, kick.aim);
    expect(kick.dive).not.toBeNull();
    const first = kick.dive;
    tapGoal(game, { x: 0.1, y: 0.1 });
    expect(kick.dive).toBe(first);
    await later(game.state.round.settings.warn + FLIGHT + 50);
    expect(kick.outcome).toBe("saved");
  });

  it("lets Flick score when the player does not dive, or dives too late", async () => {
    const { game, later } = await makeGame({ opening: { solo: true } });
    await press(game, "play");
    await later(50);
    swipe(game, CORNER);
    await later(FLIGHT + RESULT + 100);
    await later(THINK + 50);
    const { kick } = game.state.round;
    kick.aim = snapAim({ x: 0.8, y: 0.3 });
    await later(kick.landAt - game.now() - 40);
    tapGoal(game, kick.aim);
    expect(kick.dive).toBeNull();
    await later(100);
    expect(kick.outcome).toBe("goal");
  });

  it("plays a whole shoot-out against Flick to its star card, saves the progress, and never touches the live channel", { timeout: 60_000 }, async () => {
    const core = fakeCore();
    const { game, later, store } = await makeGame({ opening: { solo: true }, core });
    await press(game, "play");
    for (let tries = 0; tries < 40 && game.state.screen === "play"; tries += 1) await later(3000, { each: playWell });
    expect(game.state.screen).toBe("end");
    const { outcome, round } = game.state;
    expect(overOf(round.kicks)).not.toBeNull();
    expect(round.kicks.length).toBeGreaterThanOrEqual(6);
    expect(outcome.stars).toBeGreaterThanOrEqual(1);
    expect(outcome.mine).toBeGreaterThan(outcome.theirs);
    expect(outcome.won).toBe(true);
    expect(JSON.parse(store.kept.get("progress")).level).toBe(2);
    expect(core.ft.live.send).not.toHaveBeenCalled();
    await press(game, "again");
    await later(50);
    expect(game.state.screen).toBe("play");
    expect(game.state.round.settings.level).toBe(2);
    expect(game.state.round.kicks).toEqual([]);
  });

  it("teaches the swipe and the dive until each has been done once, and remembers it", async () => {
    const { game, later, store } = await makeGame({ opening: { solo: true } });
    await press(game, "play");
    await later(50);
    expect(game.state.taught).toEqual({ shoot: false, keep: false });
    swipe(game, CORNER);
    expect(game.state.taught).toEqual({ shoot: true, keep: false });
    await later(FLIGHT + RESULT + THINK + 200);
    tapGoal(game, { x: 0.5, y: 0.5 });
    await game.idle();
    expect(game.state.taught).toEqual({ shoot: true, keep: true });
    expect(JSON.parse(store.kept.get("goalswipe")).taught).toEqual({ shoot: true, keep: true });
  });

  it("stops the kick while paused, takes it up where it was, and leaves the round from the pause", async () => {
    const { game, later } = await makeGame({ opening: { solo: true } });
    await press(game, "play");
    await later(50);
    swipe(game, CORNER);
    await later(200);
    await press(game, "pause");
    await later(5000);
    expect(game.state.round.kick.phase).toBe("fly");
    expect(kinds(game)).toEqual(expect.arrayContaining(["resume", "home"]));
    await press(game, "resume");
    await later(FLIGHT - 250);
    expect(game.state.round.kick.phase).toBe("fly");
    await later(200);
    expect(game.state.round.kick.phase).toBe("result");
    await press(game, "pause");
    await press(game, "home");
    expect(game.state).toMatchObject({ screen: "home", round: null });
  });

  it("lets two players share one device: one swipes, the other taps the goal while the ring shows", async () => {
    const { game, later } = await makeGame({ opening: { chat: undefined }, width: 1280, height: 748 });
    await press(game, "variant", "pair");
    await press(game, "play");
    await later(50);
    expect(game.state.round.kind).toBe("pair");
    swipe(game, CORNER);
    const first = game.state.round.kick;
    expect(first).toMatchObject({ shooter: 0, phase: "fly" });
    expect(first.flyAt - first.ringAt).toBeGreaterThanOrEqual(300);
    tapGoal(game, CORNER);
    await later(first.landAt - game.now() + 20);
    expect(first.outcome).toBe("saved");
    await later(RESULT + 50);
    expect(game.state.round.kick).toMatchObject({ shooter: 1, phase: "aim" });
    swipe(game, CORNER);
    await later(game.state.round.settings.warn + FLIGHT + RESULT + 100);
    expect(game.state.round.kicks.map((kick) => kick.outcome)).toEqual(["saved", "goal"]);
  });

  it("shoots and dives from the named buttons too, for a keyboard or a screen reader", async () => {
    const { game, later } = await makeGame({ opening: { solo: true } });
    await press(game, "play");
    await later(50);
    game.press(targetOf(game, "shoot", "left"));
    expect(game.state.round.kick).toMatchObject({ phase: "fly" });
    expect(game.state.round.kick.aim.x).toBeLessThan(0.3);
    await later(FLIGHT + RESULT + THINK + 200);
    game.press(targetOf(game, "dive", "right"));
    expect(game.state.round.kick.dive.x).toBeGreaterThan(0.7);
  });

  it("sounds the kick and what comes of it", async () => {
    const { game, later, sound } = await makeGame({ opening: { solo: true } });
    await press(game, "play");
    for (let tries = 0; tries < 6; tries += 1) await later(3000, { each: playWell });
    const played = sound.play.mock.calls.map(([name]) => name);
    expect(played).toContain("whoosh");
    expect(played).toContain("tick");
    expect(played.some((name) => ["success", "bounce", "collect", "splash", "error-soft"].includes(name))).toBe(true);
  });

  it("lets the player pick an owned ball and field, and shakes a wrapped one without taking it", async () => {
    const { game, store } = await makeGame({ opening: { solo: true } });
    await press(game, "looks");
    expect(game.state.screen).toBe("looks");
    await press(game, "look", 1);
    expect(game.state.progress.chosen.ball).toBe("beachball");
    await press(game, "look", 2);
    expect(game.state.progress.chosen.ball).toBe("beachball");
    expect(game.state.moments.some((one) => one.kind === "shake")).toBe(true);
    await press(game, "tab", "field");
    await press(game, "look", 1);
    expect(game.state.progress.chosen.field).toBe("school");
    await game.idle();
    expect(JSON.parse(store.kept.get("progress")).chosen).toEqual({ ball: "beachball", field: "school" });
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

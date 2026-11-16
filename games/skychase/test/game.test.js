import { describe, expect, it } from "vitest";
import { fakeCore } from "../../../kit/test/helpers.js";
import { START } from "../src/arena.js";
import { scoreOf } from "../src/match.js";
import { COUNTDOWN } from "../src/rounds.js";
import { finger, makeGame, playWell, press, targetOf } from "./harness.js";

const kinds = (game) => game.targets().map((one) => one.kind);

describe("the game", () => {
  it("opens on its home screen: Flick's seat against FlickerTalk and outside a chat, the other person's in a chat", async () => {
    const flick = await makeGame({ opening: { solo: true } });
    expect(flick.game.state).toMatchObject({ screen: "home", mode: "flick" });
    expect(kinds(flick.game)).toEqual(expect.arrayContaining(["play", "avatar", "looks", "rival", "speaker", "music"]));
    const friend = await makeGame({ opening: { live: true } });
    expect(friend.game.state.mode).toBe("friend");
    expect(kinds(friend.game)).toContain("rival");
    const alone = await makeGame({ opening: { chat: undefined } });
    expect(alone.game.state.mode).toBe("alone");
    expect(alone.game.duel).toBeNull();
    expect(kinds(alone.game)).toEqual(expect.arrayContaining(["play", "rival"]));
    expect(kinds(alone.game)).not.toContain("variant");
  });

  it("counts down before anyone moves, a finger held through it steering only once it starts", async () => {
    const { game, later } = await makeGame({ opening: { solo: true } });
    await press(game, "play");
    expect(game.state.screen).toBe("play");
    finger(game, "down");
    await later(COUNTDOWN - 200);
    const { match } = game.state.round;
    expect(match.step).toBe(0);
    expect(match.crafts[0]).toMatchObject({ x: START[0].x, y: START[0].y, hx: 0 });
    await later(600);
    expect(match.step).toBeGreaterThan(20);
    expect(match.crafts[0].hx).toBeGreaterThan(0.2);
  });

  it("plays against Flick outside a chat too, on this phone alone", async () => {
    const core = fakeCore();
    const { game, later } = await makeGame({ opening: { chat: undefined }, core });
    await press(game, "play");
    expect(game.state.round).toMatchObject({ kind: "flick", own: [true, true] });
    expect(game.state.round.mind).not.toBeNull();
    await later(COUNTDOWN + 2000);
    expect(game.state.round.match.crafts[1].down).toBe(true);
    expect(core.ft.live.send).not.toHaveBeenCalled();
  });

  it("plays a whole round against Flick to its star card, saves the progress, and never touches the live channel", { timeout: 60_000 }, async () => {
    const core = fakeCore();
    const { game, later, store } = await makeGame({ opening: { solo: true }, core });
    await press(game, "play");
    expect(game.state.round.mind).not.toBeNull();
    expect(game.duel).toBeNull();
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

  it("sounds the pops, and keeps the points in the round", { timeout: 60_000 }, async () => {
    const { game, later, sound } = await makeGame({ opening: { solo: true }, seed: 21 });
    await press(game, "play");
    await later(COUNTDOWN + 30_000, { each: playWell });
    expect(sound.play.mock.calls.map(([name]) => name)).toContain("pop");
    const { match } = game.state.round;
    expect(scoreOf(match, 0) + scoreOf(match, 1)).toBeGreaterThan(0);
  });

  it("opens the pick screen from the player's face", async () => {
    const { game } = await makeGame({ opening: { solo: true } });
    await press(game, "avatar");
    expect(game.state.screen).toBe("avatar");
    expect(targetOf(game, "profile")).toBeDefined();
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { phones, settle } from "../../../kit/test/helpers.js";
import { makeGame, memoryStore, playRound, tap, targetOf } from "./harness.js";

afterEach(() => vi.restoreAllMocks());

const played = (sound) => sound.play.mock.calls.map(([name]) => name);

describe("a battle against FlickerTalk", () => {
  it("is played to the end on the phone, Flick shooting back, without a word on the live channel", async () => {
    const { game, core, later } = await makeGame({ opening: { solo: true } });
    expect(game.state.mode).toBe("flick");
    await tap(game, targetOf(game, "play"));
    expect(game.state.screen).toBe("play");
    await playRound(game, later);
    expect(game.state.screen).toBe("end");
    const { outcome } = game.state;
    expect(outcome.rival).toEqual({ score: expect.any(Number) });
    expect(outcome.stars).toBeGreaterThanOrEqual(1);
    expect(game.state.round.moves.filter((move) => /^[ft]/.test(move)).length).toBeGreaterThan(1);
    expect(core.ft.live.send).not.toHaveBeenCalled();
  }, 60_000);

  it("shows the paint only when the ball lands, and Flick shoots only after a pause to think", async () => {
    const { game, later, now } = await makeGame({ opening: { solo: true } });
    await tap(game, targetOf(game, "play"));
    await later(600);
    if (!game.myTurn()) await later(8000);
    expect(game.myTurn()).toBe(true);
    const before = game.state.round.shown;
    await tap(game, targetOf(game, "fire"));
    expect(game.state.round.flight).not.toBeNull();
    expect(game.state.round.shown).toBe(before);
    const { flight } = game.state.round;
    await later(Math.max(0, flight.start + flight.delay + flight.duration - now()) + 60);
    expect(game.state.round.shown).toBe(before + 1);
    expect(game.myTurn()).toBe(false);
    const moves = game.state.round.moves.length;
    await later(400);
    expect(game.state.round.moves.length).toBe(moves);
    expect(game.state.flickThinking).toBe(true);
    await later(2000);
    expect(game.state.round.moves.length).toBe(moves + 1);
  }, 60_000);

  it("goes on where it was when the game is closed and opened again", async () => {
    const store = memoryStore();
    const first = await makeGame({ opening: { solo: true }, store });
    await tap(first.game, targetOf(first.game, "play"));
    await first.later(600);
    if (!first.game.myTurn()) await first.later(8000);
    await tap(first.game, targetOf(first.game, "fire"));
    await first.later(6000);
    const moves = first.game.state.round.moves;
    const again = await makeGame({ opening: { solo: true }, store, core: first.core });
    await tap(again.game, targetOf(again.game, "play"));
    expect(again.game.state.round.moves.slice(0, moves.length)).toEqual(moves);
  }, 60_000);
});

describe("aiming and shooting", () => {
  it("aims by pulling back from the vehicle and shoots on letting go", async () => {
    const { game, later, sound } = await makeGame({ opening: { chat: undefined } });
    await tap(game, targetOf(game, "play"));
    await later(600);
    expect(game.state.round.mode).toBe("practice");
    const [x, y] = game.anchorOnScreen();
    game.pointer({ type: "down", x: x - 10, y: y + 10 });
    game.pointer({ type: "move", x: x - 60, y: y + 60 });
    expect(game.state.round.pull).not.toBeNull();
    expect(game.state.round.aim.angle).toBe(45);
    game.pointer({ type: "up", x: x - 60, y: y + 60 });
    await game.idle();
    expect(game.state.round.moves.at(-1)).toMatch(/^f45\d\d$/);
    expect(played(sound)).toContain("whoosh");
  });

  it("turns the dials a step at a time, and shoots the dials' aim with the big button", async () => {
    const { game, later } = await makeGame({ opening: { chat: undefined } });
    await tap(game, targetOf(game, "play"));
    await later(600);
    game.press(targetOf(game, "angle"));
    game.press(targetOf(game, "power"));
    expect(game.state.round.aim).toEqual({ angle: 50, power: 65 });
    await tap(game, targetOf(game, "fire"));
    expect(game.state.round.moves.at(-1)).toBe("f5065");
  });

  it("lets a submarine dive and fire a paint torpedo", async () => {
    const { game, later } = await makeGame({ opening: { chat: undefined } });
    game.press(targetOf(game, "variant", "deep"));
    await tap(game, targetOf(game, "play"));
    await later(600);
    expect(targetOf(game, "dive")).toBeDefined();
    await tap(game, targetOf(game, "dive"));
    expect(game.state.round.torpedo).toBe(true);
    await tap(game, targetOf(game, "fire"));
    expect(game.state.round.moves.at(-1)).toMatch(/^t/);
  });
});

describe("target practice", () => {
  it("is ten shots at the battlefield's targets, ending on the star card with the best mark of its own", async () => {
    const { game, later } = await makeGame({ opening: { chat: undefined } });
    expect(game.state.mode).toBe("alone");
    await tap(game, targetOf(game, "play"));
    await playRound(game, later);
    expect(game.state.screen).toBe("end");
    expect(game.state.round.moves.length).toBeLessThanOrEqual(11);
    expect(game.state.progress.bests.practice).toBe(game.state.outcome.score);
  }, 60_000);

  it("can be chosen instead of Flick by tapping Flick's seat", async () => {
    const { game } = await makeGame({ opening: { solo: true } });
    await tap(game, targetOf(game, "rival"));
    expect(game.state.practice).toBe(true);
    await tap(game, targetOf(game, "play"));
    expect(game.state.round.mode).toBe("practice");
  });
});

describe("a battle with a friend", () => {
  it("is played on two phones over the conversation, each shot on both", async () => {
    vi.useFakeTimers();
    const { a, b } = phones();
    const one = await makeGame({ opening: { live: true }, core: a });
    const two = await makeGame({ opening: { live: true }, core: b });
    const tables = () => [one.game.duel.table, two.game.duel.table];
    await tap(one.game, targetOf(one.game, "play"));
    await settle(tables());
    await tap(two.game, targetOf(two.game, "play"));
    await settle(tables());
    await one.later(300);
    await two.later(300);
    await settle(tables());
    await one.later(300);
    await two.later(300);
    const shooter = one.game.myTurn() ? one : two;
    const other = shooter === one ? two : one;
    expect(other.game.myTurn()).toBe(false);
    await tap(shooter.game, targetOf(shooter.game, "fire"));
    await settle(tables());
    await other.later(300);
    await shooter.later(300);
    expect(other.game.state.round.states).toHaveLength(2);
    expect(JSON.stringify(other.game.state.round.states[1])).toBe(JSON.stringify(shooter.game.state.round.states[1]));
    vi.useRealTimers();
  }, 60_000);
});

import { describe, expect, it } from "vitest";
import { fakeCore } from "../../../kit/test/helpers.js";
import { FLOOR_MS } from "../src/duel.js";
import { COUNTDOWN } from "../src/rounds.js";
import { makeGame, phaseOf, press, reacting, strikeNow, tapAt, targetOf, until } from "./harness.js";

const kinds = (game) => game.targets().map((one) => one.kind);
const mineOf = (round, x) => round.claims[round.seat].find((one) => one.x === x);
const flickOf = (round, x) => round.claims[1].find((one) => one.x === x);

async function playing(opening = { solo: true }, options = {}) {
  const made = await makeGame({ opening, ...options });
  await press(made.game, "play");
  await made.later(COUNTDOWN + 50);
  return made;
}

const atPhase = (made, phase, from = 0) => until(made, () => {
  const seen = phaseOf(made.game);
  return seen.phase === phase && seen.exchange.x >= from && (phase !== "go" || made.game.state.round.shown.has(seen.exchange.x)) ? seen.exchange : null;
});

describe("the game", () => {
  it("opens on its home screen: Flick's seat against FlickerTalk, the other person's in a chat, and outside a chat a choice between Flick and two on this phone", async () => {
    const flick = await makeGame({ opening: { solo: true } });
    expect(flick.game.state).toMatchObject({ screen: "home", mode: "flick" });
    expect(kinds(flick.game)).toEqual(expect.arrayContaining(["play", "avatar", "looks", "rival", "speaker", "music"]));
    expect(kinds(flick.game)).not.toContain("variant");
    const friend = await makeGame({ opening: { live: true } });
    expect(friend.game.state.mode).toBe("friend");
    expect(kinds(friend.game)).toContain("rival");
    const alone = await makeGame({ opening: { chat: undefined } });
    expect(alone.game.state.mode).toBe("alone");
    expect(kinds(alone.game)).not.toContain("rival");
    expect(alone.game.targets().filter((one) => one.kind === "variant").map((one) => one.value)).toEqual(["flick", "pair"]);
  });

  it("counts down before the first exchange, never starting by itself", async () => {
    const { game, later } = await makeGame({ opening: { solo: true } });
    await later(5000);
    expect(game.state.screen).toBe("home");
    await press(game, "play");
    expect(game.state.screen).toBe("play");
    await later(COUNTDOWN - 200);
    expect(game.state.round.step).toBe(0);
    await later(1500);
    expect(game.state.round.step).toBeGreaterThan(40);
  });

  it("pops Flick's balloon when the player taps after the bell before Flick does, with the time this phone measured", async () => {
    const made = await playing();
    const { game, later, store } = made;
    const exchange = await atPhase(made, "go");
    await later(150);
    strikeNow(game);
    const { round } = game.state;
    const mine = mineOf(round, exchange.x);
    expect(mine.r).toBeGreaterThanOrEqual(150);
    expect(mine.r).toBeLessThan(200);
    expect(round.verdicts.get(exchange.x)).toMatchObject({ win: [true, false] });
    expect(round.scores).toEqual([1, 0]);
    expect(game.state.moments.map((one) => one.kind)).toEqual(expect.arrayContaining(["strike", "pop"]));
    expect(game.state.taught).toBe(true);
    await game.idle();
    expect(JSON.parse(store.kept.get("foamduel")).taught).toBe(true);
    await later(1500);
    expect(flickOf(round, exchange.x)).toBeUndefined();
  });

  it("measures the time on the round's own clock, to the millisecond between two frames", async () => {
    const made = await playing();
    const exchange = await atPhase(made, "go");
    await made.later(320);
    made.time.now += 7;
    strikeNow(made.game);
    expect(mineOf(made.game.state.round, exchange.x).r).toBe(Math.round(made.game.state.round.step * 20 + made.game.state.round.steps.carry + 7 - made.game.state.round.shown.get(exchange.x)));
  });

  it("lets Flick pop the player's balloon when nobody taps, about as fast as its level says", async () => {
    const made = await playing();
    const { game, later } = made;
    const exchange = await atPhase(made, "go");
    await later(1100);
    const { round } = game.state;
    const flick = flickOf(round, exchange.x);
    expect(flick.r).toBeGreaterThan(450);
    expect(flick.r).toBeLessThan(950);
    expect(round.verdicts.get(exchange.x)).toMatchObject({ win: [false, true] });
    expect(round.scores).toEqual([0, 1]);
    strikeNow(game);
    expect(mineOf(round, exchange.x)).toBeUndefined();
  });

  it("makes a tap before the bell a stumble that gives the exchange away, and the bell does not ring for it", async () => {
    const made = await playing();
    const { game, later, sound } = made;
    const exchange = await atPhase(made, "wait");
    strikeNow(game);
    const { round } = game.state;
    expect(mineOf(round, exchange.x)).toMatchObject({ r: 0 });
    expect(round.verdicts.get(exchange.x)).toMatchObject({ win: [false, true], early: [true, false] });
    expect(game.state.moments.map((one) => one.kind)).toEqual(expect.arrayContaining(["stumble", "strike", "pop"]));
    expect(sound.play.mock.calls.map(([name]) => name)).toContain("error-soft");
    await later((exchange.end - round.step) * 20 - 100);
    expect(round.shown.has(exchange.x)).toBe(false);
    expect(round.scores).toEqual([0, 1]);
    expect(game.state.taught).toBe(false);
  });

  it("takes a tap faster than anyone can react for a tap before the bell", async () => {
    const made = await playing();
    const exchange = await atPhase(made, "go");
    await made.later(48);
    strikeNow(made.game);
    const { round } = made.game.state;
    expect(mineOf(round, exchange.x).r).toBeLessThan(FLOOR_MS);
    expect(round.verdicts.get(exchange.x).early).toEqual([true, false]);
  });

  it("ignores taps between two exchanges and a second tap in the same one", async () => {
    const made = await playing();
    const { game, later } = made;
    strikeNow(game);
    expect(game.state.round.claims[0]).toEqual([]);
    const exchange = await atPhase(made, "go");
    await later(200);
    strikeNow(game);
    strikeNow(game);
    await later(700);
    strikeNow(game);
    expect(game.state.round.claims[0]).toHaveLength(1);
    expect(game.state.round.claims[0][0].x).toBe(exchange.x);
  });

  it("strikes from a tap anywhere in the yard, and from the pad's own button", async () => {
    const made = await playing();
    const { game } = made;
    await atPhase(made, "go");
    await made.later(200);
    const { stage } = game.state.layout;
    tapAt(game, stage.x + 30, stage.y + 60);
    expect(game.state.round.claims[0]).toHaveLength(1);
    await atPhase(made, "go", 1);
    await made.later(200);
    game.press(targetOf(game, "strike", 0));
    expect(game.state.round.claims[0]).toHaveLength(2);
  });

  it("plays a whole round against Flick to its star card, saves the progress, and never touches the live channel", { timeout: 60_000 }, async () => {
    const core = fakeCore();
    const { game, later, store } = await makeGame({ opening: { solo: true }, core });
    await press(game, "play");
    await later(COUNTDOWN + 40_000, { each: reacting(300) });
    expect(game.state.screen).toBe("end");
    const { outcome } = game.state;
    expect(outcome.mine).toBeGreaterThanOrEqual(4);
    expect(outcome.mine).toBeGreaterThan(outcome.theirs);
    expect(outcome.stars).toBeGreaterThanOrEqual(2);
    expect(outcome.won).toBe(true);
    expect(JSON.parse(store.kept.get("progress")).level).toBe(2);
    expect(core.ft.live.send).not.toHaveBeenCalled();
    expect(game.duel).toBeNull();
    await press(game, "again");
    expect(game.state.screen).toBe("play");
    expect(game.state.round.settings.level).toBe(2);
  });

  it("is lost to Flick by a player slower than it", { timeout: 60_000 }, async () => {
    const slow = await makeGame({ opening: { solo: true } });
    await press(slow.game, "play");
    await slow.later(COUNTDOWN + 40_000, { each: reacting(900) });
    expect(slow.game.state.outcome.theirs).toBeGreaterThan(slow.game.state.outcome.mine);
    expect(slow.game.state.outcome.won).toBe(false);
  });

  it("ends a round when its seconds are up, whatever the player did", async () => {
    const { game, later } = await playing();
    await later(34_000);
    expect(game.state.screen).toBe("play");
    await later(3000);
    expect(game.state.screen).toBe("end");
    expect(game.state.round.step).toBe(35 * 50);
    expect(game.state.outcome).toMatchObject({ mine: 0, stars: 1, won: false });
  });

  it("stops the round while paused, the reaction clock with it, and leaves it from the pause", async () => {
    const made = await playing();
    const { game, later } = made;
    const exchange = await atPhase(made, "go");
    await later(100);
    await press(game, "pause");
    const step = game.state.round.step;
    await later(2000);
    expect(game.state.round.step).toBe(step);
    expect(kinds(game)).toEqual(expect.arrayContaining(["resume", "home"]));
    await press(game, "resume");
    await later(100);
    strikeNow(game);
    const mine = mineOf(game.state.round, exchange.x);
    expect(mine.r).toBeGreaterThanOrEqual(160);
    expect(mine.r).toBeLessThan(260);
    await press(game, "pause");
    await press(game, "home");
    expect(game.state).toMatchObject({ screen: "home", round: null });
  });

  it("puts two players on one phone outside a chat, each on their own side with their own pad", { timeout: 60_000 }, async () => {
    const made = await makeGame({ opening: { chat: undefined } });
    const { game, later } = made;
    await press(game, "variant", "pair");
    await press(game, "play");
    expect(game.state.round.kind).toBe("pair");
    expect(game.targets().filter((one) => one.kind === "strike").map((one) => one.value)).toEqual([0, 1]);
    await later(COUNTDOWN + 50);
    const first = await atPhase(made, "go");
    await later(200);
    strikeNow(game, 1);
    await later(40);
    strikeNow(game, 0);
    await later(40);
    expect(game.state.round.verdicts.get(first.x)).toMatchObject({ win: [false, true] });
    expect(game.state.round.claims[0]).toEqual([]);
    const second = await atPhase(made, "wait", first.x + 1);
    const { stage } = game.state.layout;
    tapAt(game, stage.x + stage.w - 20, stage.y + 40);
    expect(game.state.round.verdicts.get(second.x)).toMatchObject({ win: [true, false], early: [false, true] });
    await later(60_000);
    expect(game.state.screen).toBe("end");
    expect(game.state.outcome).toMatchObject({ mine: 1, theirs: 1, kind: "pair" });
    const again = await makeGame({ opening: { chat: undefined }, store: made.store });
    expect(again.game.state.variant).toBe("pair");
  });

  it("sounds the bell, the swing and the pop", async () => {
    const made = await playing();
    await atPhase(made, "go");
    await made.later(200);
    strikeNow(made.game);
    const played = made.sound.play.mock.calls.map(([name]) => name);
    expect(played).toEqual(expect.arrayContaining(["bell", "whoosh", "pop"]));
  });

  it("lets the player pick a sword or a place they own, and shakes a wrapped one without taking it", async () => {
    const { game, store } = await makeGame({ opening: { solo: true } });
    await press(game, "looks");
    expect(game.state).toMatchObject({ screen: "looks", looks: "sword" });
    await press(game, "look", 2);
    expect(game.state.progress.chosen.sword).toBe("paddle");
    await press(game, "look", 4);
    expect(game.state.progress.chosen.sword).toBe("paddle");
    expect(game.state.moments.some((one) => one.kind === "shake")).toBe(true);
    await press(game, "tab", "scenery");
    await press(game, "look", 1);
    expect(game.state.progress.chosen.scenery).toBe("castle");
    game.state.progress = { ...game.state.progress, received: ["pillows"] };
    await press(game, "look", 1);
    expect(game.state.progress.chosen.scenery).toBe("pillows");
    await game.idle();
    expect(JSON.parse(store.kept.get("progress")).chosen).toEqual({ sword: "paddle", scenery: "pillows" });
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

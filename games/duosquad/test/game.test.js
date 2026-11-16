import { describe, expect, it } from "vitest";
import { fakeCore } from "../../../kit/test/helpers.js";
import { CAUGHT_MOST, CRAFT_V } from "../src/crafts.js";
import { HULLS } from "../src/levels.js";
import { COUNTDOWN } from "../src/rounds.js";
import { chase, makeGame, mate, mine, press, steerTo, targetOf, until } from "./harness.js";

const kinds = (game) => game.targets().map((one) => one.kind);

async function playing(opening = { solo: true }, world = "space") {
  const made = await makeGame({ opening });
  await press(made.game, "variant", world);
  await press(made.game, "play");
  await made.later(COUNTDOWN + 100);
  return made;
}

describe("the game", () => {
  it("opens on its home screen with the three worlds to choose from and the teammate's seat: Flick's against FlickerTalk and alone, the other person's in a chat", async () => {
    const flick = await makeGame({ opening: { solo: true } });
    expect(flick.game.state).toMatchObject({ screen: "home", mode: "flick", world: "space" });
    expect(kinds(flick.game)).toEqual(expect.arrayContaining(["play", "avatar", "looks", "rival", "speaker", "music"]));
    expect(flick.game.targets().filter((one) => one.kind === "variant").map((one) => one.value)).toEqual(["space", "sea", "land"]);
    const friend = await makeGame({ opening: { live: true } });
    expect(friend.game.state.mode).toBe("friend");
    expect(friend.game.duel).not.toBeNull();
    const alone = await makeGame({ opening: { chat: undefined } });
    expect(alone.game.state.mode).toBe("alone");
    expect(alone.game.duel).toBeNull();
    expect(kinds(alone.game)).toContain("rival");
  });

  it("remembers the world the player chose", async () => {
    const { game, store } = await makeGame({ opening: { solo: true } });
    await press(game, "variant", "sea");
    expect(game.state.world).toBe("sea");
    const again = await makeGame({ opening: { solo: true }, store });
    expect(again.game.state.world).toBe("sea");
  });

  it("counts down before the first enemies, never starting by itself, and then they come down into the field", async () => {
    const { game, later } = await makeGame({ opening: { solo: true } });
    await later(5000);
    expect(game.state.screen).toBe("home");
    await press(game, "play");
    expect(game.state.screen).toBe("play");
    await later(COUNTDOWN - 200);
    expect(game.state.round.step).toBe(0);
    await later(2500);
    expect(game.state.round.step).toBeGreaterThan(60);
    const { enemies } = game.onShow();
    expect(enemies.length).toBeGreaterThanOrEqual(3);
    for (const one of enemies) expect(one.v).toBeGreaterThan(0);
  });

  it("flies the player's craft towards the finger and fires by itself; the first drag ends the steering hint", async () => {
    const { game, later, store } = await playing();
    const start = mine(game).u;
    expect(game.state.taught).toEqual([]);
    steerTo(game, 0.8);
    await later(1200);
    expect(mine(game).u).toBeCloseTo(0.8, 2);
    expect(mine(game).u).not.toBe(start);
    expect(mine(game).firedAt).toBeGreaterThan(0);
    expect(game.state.taught).toEqual(["steer"]);
    expect(JSON.parse(store.kept.get("duosquad")).taught).toEqual(["steer"]);
  });

  it("pops an enemy the craft's bolts land on and adds it to the team's score, with the player's own part", async () => {
    const made = await playing();
    const { game } = made;
    await until(made, () => game.state.round.tally.scores[0] > 0, { each: chase });
    const { tally } = game.state.round;
    expect(tally.total).toBe(tally.scores[0] + tally.scores[1]);
    expect(game.state.round.mine.length).toBeGreaterThan(0);
  });

  it("catches a craft that something thrown lands on: it cannot steer until Flick comes over and frees it", async () => {
    const made = await playing();
    const { game, later } = made;
    steerTo(game, 0.1);
    await until(made, () => game.onShow().falling.some((one) => one.v > 0.3 && one.v < CRAFT_V - 0.15));
    await until(made, () => mine(game).caught > 0, {
      each: () => {
        const falling = game.onShow().falling.filter((one) => one.v < CRAFT_V).sort((one, two) => two.v - one.v)[0];
        if (falling && mine(game).caught <= 0) steerTo(game, falling.u);
      },
    });
    const at = mine(game).u;
    expect(game.state.moments.some((one) => one.kind === "caught" && one.seat === 0)).toBe(true);
    steerTo(game, at > 0.5 ? 0.1 : 0.9);
    await later(300);
    expect(mine(game).u).toBe(at);
    await until(made, () => mine(game).caught <= 0, { most: (CAUGHT_MOST / 40) * 1000 - 1500 });
    expect(Math.abs(mate(game).u - at)).toBeLessThan(0.25);
    expect(game.state.moments.some((one) => one.kind === "freed" && one.seat === 0 && one.touched)).toBe(true);
  });

  it("frees Flick when the player flies over to him, and that ends the second hint", async () => {
    const made = await playing();
    const { game, later } = made;
    mate(game).caught = CAUGHT_MOST;
    steerTo(game, mate(game).u);
    await later(1500);
    expect(mate(game).caught).toBe(0);
    expect(game.state.taught).toContain("free");
  });

  it("plays a whole round with Flick to its star card, saves the progress, and never touches the live channel", { timeout: 60_000 }, async () => {
    const core = fakeCore();
    const made = await makeGame({ opening: { solo: true }, core });
    const { game, later, store } = made;
    await press(game, "play");
    expect(game.state.round).toMatchObject({ kind: "flick", seat: 0, world: "space", zone: "orbit" });
    await until(made, () => game.state.screen === "end", { most: COUNTDOWN + 40_000, each: chase });
    await later(200);
    const { outcome } = game.state;
    expect(outcome.score).toBe(outcome.mine + outcome.theirs + (outcome.cleared ? game.state.round.tally.bonus : 0));
    expect(outcome.mine).toBeGreaterThan(0);
    expect(outcome.theirs).toBeGreaterThan(0);
    expect(outcome).toMatchObject({ cleared: true, won: true });
    expect(outcome.stars).toBeGreaterThanOrEqual(2);
    expect(JSON.parse(store.kept.get("progress")).level).toBe(2);
    expect(core.ft.live.send).not.toHaveBeenCalled();
    expect(game.duel).toBeNull();
    await press(game, "again");
    expect(game.state.screen).toBe("play");
    expect(game.state.round.settings.level).toBe(2);
    expect(game.state.round.zone).toBe("nebula");
  });

  it("ends a round nobody plays when the time is up, with one star and no level gained", { timeout: 60_000 }, async () => {
    const made = await makeGame({ opening: { chat: undefined } });
    const { game, later, store } = made;
    await press(game, "play");
    game.state.round.flick = { ...game.state.round.flick, restUntil: Infinity };
    game.state.round.crafts[1].caught = 1e9;
    await later(COUNTDOWN + 35_000 + 2500);
    expect(game.state.screen).toBe("end");
    expect(game.state.outcome).toMatchObject({ cleared: false, won: false, stars: 1, theirs: 0 });
    expect(game.state.outcome.score).toBeLessThan(20);
    expect(JSON.parse(store.kept.get("progress")).level).toBe(1);
  });

  it("stops the round while paused and goes home from there", async () => {
    const { game, later } = await playing();
    await later(500);
    await press(game, "pause");
    const { step } = game.state.round;
    expect(game.resting()).toBe(true);
    await later(1000);
    expect(game.state.round.step).toBe(step);
    await press(game, "resume");
    await later(500);
    expect(game.state.round.step).toBeGreaterThan(step);
    await press(game, "pause");
    await press(game, "home");
    expect(game.state).toMatchObject({ screen: "home", round: null });
  });

  it("shows the crafts of the chosen world on the looks screen, four to a page, and only lets the player take one they have", async () => {
    const { game, store } = await makeGame({ opening: { solo: true } });
    await press(game, "variant", "land");
    await press(game, "looks");
    expect(game.targets().filter((one) => one.kind === "look")).toHaveLength(HULLS.land.length / 2);
    expect(game.targets().filter((one) => one.kind === "tab").map((one) => one.value)).toEqual([0, 1]);
    await press(game, "look", 1);
    expect(game.state.progress.chosen.land).toBe(HULLS.land[1]);
    await press(game, "tab", 1);
    await press(game, "look", 1);
    expect(game.state.progress.chosen.land).toBe(HULLS.land[1]);
    expect(game.state.moments.some((one) => one.kind === "shake" && one.index === 1)).toBe(true);
    expect(JSON.parse(store.kept.get("progress")).chosen.land).toBe(HULLS.land[1]);
    await press(game, "done");
    await press(game, "play");
    expect(game.state.round.hulls[0]).toBe(1);
    expect(targetOf(game, "pause")).toBeTruthy();
  });
});

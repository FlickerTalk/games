import { describe, expect, it } from "vitest";
import { fakeCore } from "../../../kit/test/helpers.js";
import { STEPS_PER_SECOND } from "../src/fair.js";
import { COUNTDOWN } from "../src/rounds.js";
import { JAM } from "../src/shots.js";
import { drag, makeGame, onShow, pop, press, tapAt, targetOf, unhurried, until } from "./harness.js";

const kinds = (game) => game.targets().map((one) => one.kind);
const mine = (game) => game.state.round.tally.scores[game.state.round.seat];

async function playing(opening = { solo: true }, tool = "popgun") {
  const made = await makeGame({ opening });
  await press(made.game, "variant", tool);
  await press(made.game, "play");
  await made.later(COUNTDOWN + 100);
  return made;
}

describe("the game", () => {
  it("opens on its home screen with the three toys to choose from: Flick's seat against FlickerTalk, the other person's in a chat, nobody's alone", async () => {
    const flick = await makeGame({ opening: { solo: true } });
    expect(flick.game.state).toMatchObject({ screen: "home", mode: "flick", tool: "popgun" });
    expect(kinds(flick.game)).toEqual(expect.arrayContaining(["play", "avatar", "looks", "rival", "speaker", "music"]));
    expect(flick.game.targets().filter((one) => one.kind === "variant").map((one) => one.value)).toEqual(["popgun", "blaster", "bow"]);
    const friend = await makeGame({ opening: { live: true } });
    expect(friend.game.state.mode).toBe("friend");
    expect(kinds(friend.game)).toContain("rival");
    const alone = await makeGame({ opening: { chat: undefined } });
    expect(alone.game.state.mode).toBe("alone");
    expect(kinds(alone.game)).not.toContain("rival");
    expect(kinds(alone.game)).toContain("variant");
  });

  it("remembers the toy the player chose", async () => {
    const { game, store } = await makeGame({ opening: { solo: true } });
    await press(game, "variant", "bow");
    expect(game.state.tool).toBe("bow");
    const again = await makeGame({ opening: { solo: true }, store });
    expect(again.game.state.tool).toBe("bow");
  });

  it("counts down before the first balloon, never starting by itself, and then the balloons rise", async () => {
    const { game, later } = await makeGame({ opening: { solo: true } });
    await later(5000);
    expect(game.state.screen).toBe("home");
    await press(game, "play");
    expect(game.state.screen).toBe("play");
    await later(COUNTDOWN - 200);
    expect(game.state.round.step).toBe(0);
    await later(2500);
    expect(game.state.round.step).toBeGreaterThan(60);
    expect(onShow(game).length).toBeGreaterThan(0);
  });

  it("plays a whole round against Flick to its star card, saves the progress, and never touches the live channel", { timeout: 60_000 }, async () => {
    const core = fakeCore();
    const { game, later, store } = await makeGame({ opening: { solo: true }, core });
    await press(game, "play");
    await later(COUNTDOWN + 35_000, { each: unhurried });
    await later(3000);
    expect(game.state.screen).toBe("end");
    const { outcome } = game.state;
    expect(outcome.stars).toBeGreaterThanOrEqual(2);
    expect(outcome.theirs).toBeGreaterThan(0);
    expect(outcome.mine).toBeGreaterThan(outcome.theirs);
    expect(JSON.parse(store.kept.get("progress")).level).toBe(2);
    expect(core.ft.live.send).not.toHaveBeenCalled();
    expect(game.duel).toBeNull();
    await press(game, "again");
    expect(game.state.screen).toBe("play");
    expect(game.state.round.settings.level).toBe(2);
  });

  it("plays alone for stars, with nobody on the other side", { timeout: 60_000 }, async () => {
    const { game, later } = await makeGame({ opening: { chat: undefined } });
    await press(game, "play");
    expect(game.state.round).toMatchObject({ kind: "alone", flick: null });
    await later(COUNTDOWN + 38_000, { each: pop });
    expect(game.state.screen).toBe("end");
    expect(game.state.outcome).toMatchObject({ theirs: null, won: true });
  });

  it("pops the balloon the player taps with the popgun, once the cork gets there, and teaches the tap until it is done once", async () => {
    const made = await playing();
    const { game, later, store } = made;
    expect(game.state.taught).toEqual([]);
    const found = await until(made, () => onShow(game, (kind) => kind === "round" || kind === "oval")[0]);
    tapAt(game, found.x, found.y);
    expect(mine(game)).toBe(0);
    await later(300);
    expect(mine(game)).toBe(1);
    expect(game.state.round.tally.pops.get(found.balloon.id).seat).toBe(0);
    expect(game.state.taught).toEqual(["popgun"]);
    expect(JSON.parse(store.kept.get("balloonfair"))).toEqual({ tool: "popgun", taught: ["popgun"] });
  });

  it("pops everything under a splash of the water blaster, which then has to refill", async () => {
    const made = await playing({ solo: true }, "blaster");
    const { game, later } = made;
    const found = await until(made, () => onShow(game)[0]);
    tapAt(game, found.x + 10, found.y + 10);
    await later(400);
    expect(mine(game)).toBeGreaterThanOrEqual(1);
    const { tool } = game.state.round;
    const refilled = tool.readyAt;
    tapAt(game, found.x, found.y);
    expect(tool.readyAt).toBe(refilled);
    await later(1500);
    tapAt(game, found.x, found.y);
    expect(tool.readyAt).toBeGreaterThan(refilled);
  });

  it("shoots the bow's arrow away from the pull, through the balloons in its way", async () => {
    const made = await playing({ solo: true }, "bow");
    const { game, later } = made;
    const { tool } = game.state.layout;
    const found = await until(made, () => onShow(game).find((one) => one.y < tool.y - 200));
    const [dx, dy] = [found.x - tool.x, found.y - (tool.y - tool.size * 0.3)];
    const far = Math.hypot(dx, dy);
    const start = { x: 200, y: 500 };
    drag(game, start, { x: start.x - (dx / far) * 80, y: start.y - (dy / far) * 80 });
    expect(game.state.round.tool.shots).toHaveLength(1);
    await later(700);
    expect(mine(game)).toBeGreaterThanOrEqual(1);
    expect(game.state.taught).toEqual(["bow"]);
  });

  it("only puffs a cloud, which costs the player a second without their toy and nothing else", async () => {
    const made = await playing();
    const { game, later } = made;
    const cloud = await until(made, () => onShow(game, (kind) => kind === "cloud")[0], { most: 60_000 });
    const before = mine(game);
    tapAt(game, cloud.x, cloud.y);
    await later(250);
    expect(mine(game)).toBe(before);
    expect(game.state.moments.map((one) => one.kind)).toEqual(expect.arrayContaining(["puff", "penalty"]));
    expect(game.state.round.tool.jamUntil - game.state.round.step).toBeGreaterThan(JAM - 12);
    const other = await until(made, () => onShow(game)[0], { most: 600 });
    tapAt(game, other.x, other.y);
    await later(300);
    expect(mine(game)).toBe(before);
    expect(game.state.round.tally.pops.has(cloud.balloon.id)).toBe(false);
  });

  it("stops the round while paused, and leaves it from the pause", async () => {
    const { game, later } = await playing();
    await later(500);
    await press(game, "pause");
    const step = game.state.round.step;
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

  it("ends a round when its seconds are up, whatever the player did", async () => {
    const { game, later } = await playing();
    await later(36_000);
    expect(game.state.round.step).toBe(35 * STEPS_PER_SECOND);
    await later(2000);
    expect(game.state.screen).toBe("end");
    expect(game.state.outcome).toMatchObject({ mine: 0, stars: 1 });
  });

  it("sounds the shots and the pops", async () => {
    const { game, later, sound } = await playing();
    await later(8000, { each: pop });
    const played = sound.play.mock.calls.map(([name]) => name);
    expect(played).toEqual(expect.arrayContaining(["tick", "pop"]));
  });

  it("lets the player pick a fair they own, and shakes a wrapped one without taking it", async () => {
    const { game, store } = await makeGame({ opening: { solo: true } });
    await press(game, "looks");
    expect(game.state.screen).toBe("looks");
    await press(game, "look", 1);
    expect(game.state.progress.chosen).toBe("day");
    expect(game.state.moments.some((one) => one.kind === "shake")).toBe(true);
    game.state.progress = { ...game.state.progress, received: ["beach"] };
    await press(game, "look", 1);
    expect(game.state.progress.chosen).toBe("beach");
    await game.idle();
    expect(JSON.parse(store.kept.get("progress")).chosen).toBe("beach");
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

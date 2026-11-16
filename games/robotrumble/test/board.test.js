import { describe, expect, it } from "vitest";
import { bounds, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawPlay, sceneOf } from "../src/board.js";
import { SHOW_MS } from "../src/levels.js";
import { COUNTDOWN, IMPACT_MS } from "../src/rounds.js";
import { THEME } from "../src/theme.js";
import { choose, makeGame, press } from "./harness.js";

async function pairRound() {
  const made = await makeGame({ opening: { chat: undefined } });
  await press(made.game, "variant", "pair");
  await press(made.game, "play");
  return made;
}

const scene = (game, now) => sceneOf(game.state.round, game.state.layout, now);

describe("what the robots do on the stage", () => {
  it("stand apart and still until the countdown ends, then walk towards each other while the window is open", async () => {
    const { game, later, time } = await pairRound();
    const { home, meet } = game.state.layout;
    const waiting = scene(game, time.now);
    expect(waiting.robots.map((one) => one.x)).toEqual(home);
    expect(waiting.robots.map((one) => one.pose)).toEqual(["idle", "idle"]);
    await later(COUNTDOWN + 600);
    const walking = scene(game, time.now);
    expect(walking.robots[0].x).toBeGreaterThan(home[0]);
    expect(walking.robots[0].x).toBeLessThan(meet[0]);
    expect(walking.robots[1].x).toBeLessThan(home[1]);
    expect(walking.robots[0].pose).toMatch(/^walk[AB]$/);
    expect(walking.dial).toBeGreaterThan(0);
    expect(walking.dial).toBeLessThan(1);
  });

  it("show both moves at once when the window closes: the glove springs out, lands, and knocks a bolt off", async () => {
    const { game, later, time } = await pairRound();
    await later(COUNTDOWN + 200);
    choose(game, "g", 0);
    choose(game, "b", 1);
    await later(game.state.round.settings.window);
    const at = game.state.round.shown.at;
    const striking = scene(game, at + 100);
    expect(striking.robots.map((one) => one.pose)).toEqual(["glove", "kick"]);
    expect(striking.robots.map((one) => one.x)).toEqual(game.state.layout.meet);
    expect(striking.effects.map((one) => one.kind)).toContain("motion");
    const landed = scene(game, at + IMPACT_MS + 60);
    expect(landed.robots[1].pose).toBe("hit");
    expect(landed.effects.map((one) => one.kind)).toEqual(expect.arrayContaining(["star", "part"]));
    expect(landed.effects.find((one) => one.kind === "part").type).toBe("bolt");
    expect(landed.energy).toEqual([3, 2]);
    expect(scene(game, at + 100).energy).toEqual([3, 3]);
    expect(time.now).toBeGreaterThanOrEqual(at);
  });

  it("send the glove back off the shield with a star on it, and mark two gloves meeting in the middle", async () => {
    const { game, later } = await pairRound();
    const { period, window } = game.state.round.settings;
    await later(COUNTDOWN + 200);
    choose(game, "g", 0);
    choose(game, "s", 1);
    await later(window);
    const blocked = scene(game, game.state.round.shown.at + IMPACT_MS + 60);
    expect(blocked.robots.map((one) => one.pose)).toEqual(["hit", "shield"]);
    await later(period - window + 200);
    choose(game, "g", 0);
    choose(game, "g", 1);
    await later(window);
    const { shown } = game.state.round;
    expect(shown.kind).toBe("clash");
    const clash = scene(game, shown.at + IMPACT_MS + 60);
    const star = clash.effects.find((one) => one.kind === "star");
    expect(star.x).toBeCloseTo(game.state.layout.width / 2, 4);
    expect(clash.effects.some((one) => one.kind === "part")).toBe(false);
  });

  it("sit a robot down dizzy when its batteries run out, then wind it up again laughing, back in its place", async () => {
    const { game, later } = await pairRound();
    const { period } = game.state.round.settings;
    await later(COUNTDOWN + 200);
    for (let at = 0; at < 3; at += 1) {
      choose(game, "g", 0);
      await later(period);
    }
    const { shown } = game.state.round;
    expect(shown.toppled).toBe(1);
    const down = scene(game, shown.at + IMPACT_MS + 500);
    expect(down.robots[1].pose).toBe("dizzy");
    expect(down.robots[0].pose).toBe("cheer");
    expect(down.energy[1]).toBe(0);
    expect(down.lamps).toEqual([1, 0]);
    const up = scene(game, shown.at + SHOW_MS + 700);
    expect(up.robots[1].pose).toBe("cheer");
    expect(up.robots[1].x).toBe(game.state.layout.home[1]);
    expect(up.energy[1]).toBe(3);
    expect(scene(game, shown.at + SHOW_MS + 1300).robots[1].pose).not.toBe("cheer");
  });

  it("go back to their places before the next window, and never show a button only held", async () => {
    const { game, later } = await pairRound();
    await later(COUNTDOWN + 200);
    choose(game, "b", 0);
    const before = scene(game, game.now());
    expect(before.robots[0].pose).not.toBe("kick");
    await later(game.state.round.settings.window);
    const at = game.state.round.shown.at;
    expect(scene(game, at + SHOW_MS - 1).robots[0].x).toBeCloseTo(game.state.layout.home[0], 0);
  });
});

describe("the play screen", () => {
  it("is drawn inside the frame at a phone's, a room's and a sideways size, for one player and for two", async () => {
    for (const [width, height, fill] of [[384, 801, true], [360, 343, false], [844, 338, true], [1280, 748, true]]) {
      for (const opening of [{ solo: true }, { chat: undefined }]) {
        const { game, later } = await makeGame({ opening, width, height, fill });
        if (game.state.mode === "alone") await press(game, "variant", "pair");
        await press(game, "play");
        await later(COUNTDOWN + 400);
        choose(game, "g", 0);
        await later(game.state.round.settings.window + IMPACT_MS);
        const ctx = draw((pen) => drawPlay(pen, game, THEME, 2));
        const area = bounds(painted(ctx));
        const name = `${width}x${height} ${game.state.round.kind}`;
        expect(ctx.depth, name).toBe(0);
        expect(area.right, name).toBeLessThanOrEqual(width + 40);
        expect(area.left, name).toBeGreaterThanOrEqual(-40);
        expect(ctx.calls.length, name).toBeGreaterThan(200);
      }
    }
  });

  it("teaches the glove with a hand until a button was used", async () => {
    const { game, later } = await makeGame({ opening: { solo: true } });
    await press(game, "play");
    await later(COUNTDOWN + 300);
    const before = draw((pen) => drawPlay(pen, game, THEME, 2)).calls.length;
    await press(game, "glove", 0);
    game.state.round.held[0] = 0;
    const after = draw((pen) => drawPlay(pen, game, THEME, 2)).calls.length;
    expect(before).toBeGreaterThan(after + 10);
  });
});

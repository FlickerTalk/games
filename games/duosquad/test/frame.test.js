import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { handAt } from "../src/board.js";
import { CAUGHT_MOST } from "../src/crafts.js";
import { drawFrame } from "../src/frame.js";
import { orbTarget } from "../src/hud.js";
import { PROGRESS, WORLDS } from "../src/levels.js";
import { COUNTDOWN } from "../src/rounds.js";
import { THEME } from "../src/theme.js";
import { chase, makeGame, memoryStore, press, steerTo, until } from "./harness.js";

const words = (ctx) => ctx.calls.filter((call) => call.op === "fillText" && !/^[\d\s.,:–-]+$/.test(call.text)).map((call) => call.text);
const digits = (ctx) => ctx.calls.filter((call) => call.op === "fillText").map((call) => call.text);
const SIZES = [[384, 801, true], [360, 343, false], [844, 338, true]];
const look = (game, time = 2) => draw((pen) => drawFrame(pen, game, THEME, time));

async function round(world, { width = 384, height = 801, fill = true, level = 1, opening = { solo: true } } = {}) {
  const store = memoryStore({ progress: JSON.stringify({ ...PROGRESS.fresh(), level }) });
  const made = await makeGame({ opening, width, height, fill, store });
  await press(made.game, "variant", world);
  await press(made.game, "play");
  return made;
}

describe("every screen", () => {
  it("draws without a word, only digits, at a phone, the smallest room and a phone on its side, in all three worlds", { timeout: 60_000 }, async () => {
    for (const [width, height, fill] of SIZES) {
      const name = `${width}x${height}`;
      const { game } = await makeGame({ opening: { solo: true }, width, height, fill });
      const shown = [["home", look(game)]];
      await press(game, "looks");
      shown.push(["looks", look(game)]);
      await press(game, "done");
      for (const world of WORLDS) {
        const made = await round(world, { width, height, fill, level: 3 });
        shown.push([`${world} countdown`, look(made.game)]);
        await made.later(COUNTDOWN + 5000, { each: chase });
        made.game.state.round.crafts[1].caught = CAUGHT_MOST;
        shown.push([`${world} playing`, look(made.game, made.time.now / 1000)]);
        await press(made.game, "pause");
        shown.push([`${world} paused`, look(made.game)]);
        if (world !== "space") continue;
        await press(made.game, "resume");
        await until(made, () => made.game.state.screen === "end", { most: 70_000, each: chase });
        shown.push(["end", look(made.game, made.time.now / 1000)]);
      }
      for (const [screen, ctx] of shown) {
        expect(ctx.depth, `${name} ${screen}`).toBe(0);
        expect(words(ctx), `${name} ${screen}`).toEqual([]);
        expect(ctx.calls.length, `${name} ${screen}`).toBeGreaterThan(50);
      }
    }
  });

  it("draws the play screen in the world the round is in, from that world's place colour", async () => {
    for (const world of WORLDS) {
      const { game } = await round(world);
      expect(colours(look(game))[0], world).toBe(THEME.art.worlds[world].zones[game.state.round.zone].sky);
    }
  });

  it("shows the team's shared score in the bar with each player's part, in digits of 20 px or more", async () => {
    const made = await round("space");
    await made.later(COUNTDOWN + 100);
    await until(made, () => made.game.state.round.tally.scores.every((part) => part > 0), { each: chase });
    const { tally } = made.game.state.round;
    const ctx = look(made.game, made.time.now / 1000);
    expect(digits(ctx)).toEqual(expect.arrayContaining([String(tally.total), String(tally.scores[0]), String(tally.scores[1])]));
    const sizes = ctx.calls.filter((call) => call.op === "set" && call.name === "font").map((call) => Number(/(\d+)px/.exec(call.value)[1]));
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(20);
    const goal = orbTarget(made.game.state.layout);
    expect(goal.y).toBeLessThan(made.game.state.layout.field.y);
  });

  it("puts each pilot's face in the cockpit: the player's own and Flick's", async () => {
    const made = await round("sea");
    await made.later(COUNTDOWN + 500);
    const ctx = look(made.game, made.time.now / 1000);
    const { layout } = made.game.state;
    const all = bounds(painted(ctx));
    expect(all.bottom).toBeLessThanOrEqual(801 + layout.craft);
    expect(made.game.state.round.crafts).toHaveLength(2);
    expect(ctx.calls.length).toBeGreaterThan(300);
  });

  it("teaches the drag with a hand under the player's craft until they steer, then how to free a caught teammate", async () => {
    const made = await round("land");
    const { game } = made;
    await made.later(COUNTDOWN + 500);
    expect(handAt(game.state, 1).lesson).toBe("steer");
    const [first, later] = [handAt(game.state, 0.3).x, handAt(game.state, 0.9).x];
    expect(first).not.toBe(later);
    steerTo(game, 0.2);
    await made.later(1500);
    expect(handAt(game.state, 1)).toBeNull();
    game.state.round.crafts[1].caught = 1e6;
    game.state.round.crafts[1].u = 0.8;
    expect(handAt(game.state, 1).lesson).toBe("free");
    game.state.taught = ["steer", "free"];
    expect(handAt(game.state, 1)).toBeNull();
  });

  it("shows the end card with the stars, the shared score and both pilots with their parts", { timeout: 60_000 }, async () => {
    const made = await round("space");
    await until(made, () => made.game.state.screen === "end", { most: 60_000, each: chase });
    const { outcome } = made.game.state;
    const shown = digits(look(made.game, made.time.now / 1000));
    expect(shown).toEqual(expect.arrayContaining([String(outcome.score), String(outcome.mine), String(outcome.theirs)]));
  });
});

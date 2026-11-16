import { describe, expect, it } from "vitest";
import { bounds, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { capTint, drawPlay, mateOf } from "../src/board.js";
import { IMPACT_MS } from "../src/motion.js";
import { fitting, settled, unfitting } from "./harness.js";
import { DARK, LIGHT, SIZES, fonts, gameAt, paint, texts } from "./screens.js";

const play = (game, theme = LIGHT, time = game.now() / 1000) => paint((ctx) => drawPlay(ctx, game.state, theme, time));
const lines = (ctx) => shapes(ctx).join("\n");

describe("the play screen", () => {
  it("draws the place, the hero, the golem, the buttons and the bar inside the frame at every size, alone and as a team", async () => {
    for (const [width, height, fill] of SIZES) {
      for (const opening of [{}, { solo: true }]) {
        const { game } = await gameAt("play", { width, height, fill, opening });
        const ctx = play(game);
        const box = bounds(painted(ctx));
        expect(box.left, `${width}x${height}`).toBeGreaterThanOrEqual(-2);
        expect(box.right, `${width}x${height}`).toBeLessThanOrEqual(width + 2);
        expect(box.bottom, `${width}x${height}`).toBeLessThanOrEqual(height + 2);
        expect(ctx.depth).toBe(0);
      }
    }
  });

  it("writes nothing but digits, none under 20 px: the golem's number, the divisors and the teammate's", async () => {
    for (const [width, height, fill] of SIZES) {
      const { game } = await gameAt("play", { width, height, fill, opening: { solo: true } });
      const ctx = play(game);
      const { core, mySide } = game.state.round;
      for (const text of texts(ctx)) expect(text).toMatch(/^\d+$/);
      expect(texts(ctx).sort()).toEqual([String(core.value), ...core.hands.flat().map(String)].sort());
      expect(Math.min(...fonts(ctx)), `${width}x${height}`).toBeGreaterThanOrEqual(20);
      expect(core.hands[mySide]).toEqual(game.state.layout.buttons.map((one) => one.value));
    }
  });

  it("shows the split as soon as the mallet has landed: as many golems as the divisor, each with the quotient", async () => {
    const { game, later } = await gameAt("play");
    const { round } = game.state;
    round.core = { ...round.core, golems: [{ number: 12, cap: null }, ...round.core.golems.slice(1)], value: 12 };
    round.stand = { value: 12, count: 1, cap: null };
    const before = play(game);
    expect(texts(before).filter((text) => text === "12")).toHaveLength(1);
    game.press({ kind: "hit", value: 2 });
    await later(IMPACT_MS + 300);
    const after = play(game);
    expect(texts(after).filter((text) => text === "6")).toHaveLength(2);
    expect(texts(after)).not.toContain("12");
  });

  it("answers a clink with the bell's rings and the golem's tongue, and a press with a pressed button", async () => {
    const { game, later } = await gameAt("play");
    await settled(game, later);
    const calm = lines(play(game));
    game.pointer({ type: "down", x: 0, y: 0 });
    const wrong = game.state.layout.buttons.find((one) => one.value === unfitting(game)[0]);
    game.pointer({ type: "down", x: wrong.x + 5, y: wrong.y + 5 });
    expect(lines(play(game))).not.toBe(calm);
    await later(IMPACT_MS + 100);
    const ringing = play(game);
    expect(ringing.calls.filter((call) => call.op === "arc").length).toBeGreaterThan(play(game, LIGHT, game.now() / 1000 + 5).calls.filter((call) => call.op === "arc").length);
  });

  it("dims the player's buttons while it is the teammate's turn and lights the teammate's divisors", async () => {
    const { game, later } = await gameAt("play", { opening: { solo: true } });
    const { round } = game.state;
    const alphas = (ctx) => ctx.calls.filter((call) => call.op === "set" && call.name === "globalAlpha" && call.value === 0.45).length;
    round.core = { ...round.core, golems: [{ number: 12, cap: null }, ...round.core.golems.slice(1)], value: 12, count: 1, last: 1 };
    round.stand = { value: 12, count: 1, cap: null };
    await settled(game, later);
    expect(fitting(game).length).toBeGreaterThan(0);
    const mine = play(game);
    round.core = { ...round.core, last: 0 };
    const theirs = play(game);
    expect(alphas(mine)).toBe(0);
    expect(alphas(theirs)).toBe(round.core.hands[0].length);
    expect(lines(theirs)).not.toBe(lines(mine));
  });

  it("shows Flick as the teammate against FlickerTalk and another face for a friend, with a mallet unlike the player's", async () => {
    const { game } = await gameAt("play", { opening: { solo: true } });
    expect(mateOf(game.state)).toMatchObject({ player: { who: "flick" } });
    expect(mateOf(game.state).mallet).not.toBe(game.state.progress.chosen.mallet);
    expect(mateOf({ ...game.state, mode: "friend" }).player.who).not.toBe(game.state.player.who);
    expect(mateOf({ ...game.state, mode: "alone" })).toBeNull();
  });

  it("gives each capped divisor of a hand its own cap colour", () => {
    const core = { hands: [[2, 4], [3, 5]] };
    expect([2, 4, 3, 5].map((cap) => capTint(core, cap))).toEqual([0, 1, 2, 0]);
  });

  it("keeps the stage soft on a dark page and draws the pause over the round", async () => {
    const { game } = await gameAt("play");
    expect(play(game, DARK).calls.length).toBeGreaterThanOrEqual(play(game, LIGHT).calls.length);
    const open = lines(play(game));
    game.press({ kind: "pause", value: "pause" });
    expect(lines(play(game))).not.toBe(open);
  });
});

import { describe, expect, it } from "vitest";
import { bounds, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { drawHome, drawLooks } from "../src/home-art.js";
import { THEME } from "../src/theme.js";
import { makeGame, tap, targetOf } from "./harness.js";

const texts = (ctx) => ctx.calls.filter((call) => call.op === "fillText").map((call) => call.text);
const seat = { player: { who: "flick" }, here: true, calling: false, away: false };

describe("the home screen's drawing", () => {
  it("stays inside the frame and writes nothing", async () => {
    for (const [width, height] of [[384, 801], [360, 343], [1280, 748]]) {
      const { game } = await makeGame({ width, height });
      const ctx = draw((pen) => drawHome(pen, game.state, null, THEME, 0.3));
      const box = bounds(painted(ctx));
      expect(box.right).toBeLessThanOrEqual(width + 1);
      expect(box.bottom).toBeLessThanOrEqual(height + 1);
      expect(texts(ctx)).toEqual([]);
      expect(ctx.depth).toBe(0);
    }
  });

  it("marks the chosen court among the others", async () => {
    const { game } = await makeGame();
    const before = shapes(draw((pen) => drawHome(pen, game.state, null, THEME, 0)));
    await tap(game, targetOf(game, "variant", "big"));
    expect(shapes(draw((pen) => drawHome(pen, game.state, null, THEME, 0)))).not.toEqual(before);
  });

  it("shows the rival's seat only when there is a rival, and fades a friend who is away", async () => {
    const { game } = await makeGame({ opening: { solo: true } });
    const here = draw((pen) => drawHome(pen, game.state, seat, THEME, 0));
    const away = draw((pen) => drawHome(pen, game.state, { ...seat, player: { who: "noa" }, here: false, away: true }, THEME, 0));
    expect(shapes(here)).not.toEqual(shapes(away));
    expect(away.calls.some((call) => call.name === "globalAlpha" && call.value < 0.6)).toBe(true);
  });
});

describe("the home screen's clear strip", () => {
  it("keeps the courtyard's details under the sound buttons, never behind them", async () => {
    for (const [width, height] of [[384, 801], [430, 880]]) {
      const { game } = await makeGame({ width, height });
      const ctx = draw((pen) => drawHome(pen, game.state, null, THEME, 0.3));
      const clip = ctx.calls.findIndex((call) => call.op === "clip");
      const [[left, top], [right, bottom]] = ctx.calls[clip - 1].points;
      for (const kind of ["speaker", "music"]) {
        const button = targetOf(game, kind);
        const apart = right <= button.x || left >= button.x + button.w || bottom <= button.y || top >= button.y + button.h;
        expect(apart, `${width}x${height} ${kind}`).toBe(true);
      }
    }
  });
});

describe("the looks' drawing", () => {
  it("draws each owned look and wraps the others, with no writing", async () => {
    const { game } = await makeGame();
    await tap(game, targetOf(game, "looks"));
    for (const tab of ["court", "effect"]) {
      game.state.looks = tab;
      const ctx = draw((pen) => drawLooks(pen, game.state, THEME, 0.2));
      expect(texts(ctx)).toEqual([]);
      expect(ctx.depth).toBe(0);
    }
    const owned = shapes(draw((pen) => drawLooks(pen, { ...game.state, looks: "court" }, THEME, 0)));
    const more = shapes(draw((pen) => drawLooks(pen, { ...game.state, looks: "court", progress: { ...game.state.progress, received: ["greenhouse"] } }, THEME, 0)));
    expect(more).not.toEqual(owned);
  });
});

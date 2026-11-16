import { describe, expect, it } from "vitest";
import { shapes } from "../../../kit/test/canvas/recorder.js";
import { drawBar } from "../src/bar-art.js";
import { drawEnd } from "../src/end-art.js";
import { drawFrame } from "../src/frame.js";
import { drawHome, drawLookArt, drawLooks } from "../src/home-art.js";
import { playLayout } from "../src/layout.js";
import { LOOKS } from "../src/levels.js";
import { DARK, FRAMES, LIGHT, gameAt, paint, texts } from "./screens.js";

const DIGITS = /^[0-9]+$/;
const framed = (game, theme = LIGHT) => paint((ctx) => drawFrame(ctx, game, theme, 1));
const SHOWN = { sound: { level: "high", music: true, open: false, volume: 1 }, lang: "en", me: { player: { who: "ari" }, square: 12, face: "neutral" }, other: { player: { who: "flick" }, square: 7, face: "neutral", thinking: true }, turn: 1 };

describe("the bar", () => {
  it("shows both players, their squares where there is room, and the three round buttons", () => {
    const wide = paint((ctx) => drawBar(ctx, playLayout(384, 801, { fill: true }), SHOWN, LIGHT, 0));
    expect(texts(wide).sort()).toEqual(["12", "7"]);
    const narrow = paint((ctx) => drawBar(ctx, playLayout(328, 343, { fill: false }), SHOWN, LIGHT, 0));
    expect(texts(narrow)).toEqual([]);
    expect(shapes(narrow).length).toBeGreaterThan(40);
  });

  it("rings the player whose turn it is", () => {
    const layout = playLayout(384, 801, { fill: true });
    const mine = shapes(paint((ctx) => drawBar(ctx, layout, { ...SHOWN, turn: 0, other: { ...SHOWN.other, thinking: false } }, LIGHT, 0)));
    const none = shapes(paint((ctx) => drawBar(ctx, layout, { ...SHOWN, turn: null, other: { ...SHOWN.other, thinking: false } }, LIGHT, 0)));
    expect(mine.length).toBeGreaterThan(none.length);
  });
});

describe("a frame", () => {
  it("clears the canvas and draws the screen the game is on, with no word on any of them", { timeout: 60_000 }, async () => {
    const drawn = [];
    for (const screen of ["home", "play", "end"]) {
      for (const [width, height, fill] of FRAMES) {
        const { game } = await gameAt(screen, { width, height, fill });
        expect(game.state.screen, screen).toBe(screen);
        for (const theme of [LIGHT, DARK]) {
          const ctx = framed(game, theme);
          expect(ctx.calls[0].op, screen).toBe("clearRect");
          expect(ctx.depth).toBe(0);
          expect(texts(ctx).every((text) => DIGITS.test(text)), `${screen} ${width}x${height}`).toBe(true);
          if (width === 384 && theme === LIGHT) drawn.push(shapes(ctx).join("\n"));
        }
      }
    }
    expect(new Set(drawn).size).toBe(3);
  });

  it("draws the kit's pick screen for the player's face", async () => {
    const { game } = await gameAt("home");
    game.press({ kind: "avatar", value: "avatar" });
    const ctx = framed(game);
    expect(shapes(ctx).length).toBeGreaterThan(50);
    expect(ctx.depth).toBe(0);
  });

  it("seats Flick on the home screen against FlickerTalk, and offers two ways to play outside a conversation", async () => {
    const flick = await gameAt("home");
    const alone = await gameAt("home", { opening: { chat: undefined } });
    expect(shapes(framed(flick.game)).join("\n")).not.toBe(shapes(framed(alone.game)).join("\n"));
    const seated = paint((ctx) => drawHome(ctx, flick.game.state, { player: { who: "flick" }, here: true, calling: false, away: false }, LIGHT, 0));
    const invited = paint((ctx) => drawHome(ctx, flick.game.state, { player: { who: "flick" }, here: true, calling: false, away: false }, LIGHT, 0, { invited: true }));
    expect(shapes(invited).length).toBeGreaterThan(shapes(seated).length);
  });
});

describe("the looks", () => {
  it("draw every track and every dice differently, and wrap the ones not yet received", async () => {
    const { game } = await gameAt("home");
    for (const kind of Object.keys(LOOKS)) {
      const seen = new Set(LOOKS[kind].map((look) => JSON.stringify(paint((ctx) => drawLookArt(ctx, { x: 0, y: 0, w: 120, h: 120 }, kind, look, game.state, LIGHT, 0)).calls)));
      expect(seen.size, kind).toBe(LOOKS[kind].length);
    }
    game.press({ kind: "looks", value: "looks" });
    const tracks = paint((ctx) => drawLooks(ctx, game.state, LIGHT, 0));
    game.press({ kind: "tab", value: "dice" });
    const dice = paint((ctx) => drawLooks(ctx, game.state, LIGHT, 0));
    expect(shapes(tracks).join("\n")).not.toBe(shapes(dice).join("\n"));
    expect(texts(dice).every((text) => DIGITS.test(text))).toBe(true);
  });
});

describe("the round's end", () => {
  it("shows both players with the squares they reached, the stars and the winner's piece", { timeout: 60_000 }, async () => {
    const made = await gameAt("end");
    const { outcome } = made.game.state;
    const ctx = paint((pen) => drawEnd(pen, made.game.state, LIGHT, made.now() / 1000));
    const written = texts(ctx);
    expect(written).toContain(String(outcome.mine));
    expect(written).toContain(String(outcome.theirs));
    expect(written.every((text) => DIGITS.test(text))).toBe(true);
    expect(ctx.depth).toBe(0);
  });
});

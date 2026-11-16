import { describe, expect, it } from "vitest";
import { barLayout } from "../../src/canvas/bar.js";
import { homeLayout, looksLayout, pauseLayout, promptLayout } from "../../src/canvas/menu-layout.js";
import { drawHintHand, drawHome, drawLooks, drawPause, drawPresent, drawPrompt } from "../../src/canvas/screens.js";
import { themeFromTokens } from "../../src/canvas/theme.js";
import { bounds, colours, draw, painted, shapes } from "./recorder.js";
import { tokensFor } from "./themes.js";

const UI = themeFromTokens(tokensFor("aurora-dark"));
const sound = { level: "high", music: true, open: false, volume: 0.6 };
const me = { who: "ari", hair: "none", hairColour: "ink", name: "" };
const flick = { who: "flick" };
const texts = (ctx) => ctx.calls.filter((call) => call.op === "fillText").map((call) => call.text);
const present = { box: "box", lid: "lid", ribbon: "ribbon", ink: "ink" };

function home(width, height, { seat = null, press = null, open = false, stage } = {}) {
  const layout = homeLayout(width, height, { variants: ["one", "two"], rival: Boolean(seat), fill: true });
  return draw((ctx) => drawHome(ctx, { width, height, player: me, variant: "one", sound: { ...sound, open }, press }, UI, 0.3, { layout, seat, volume: barLayout(width, height).volume, drawStage: stage ?? (() => {}), drawVariant: () => {} }));
}

describe("the home screen", () => {
  it("draws every target inside the frame, without writing anything", () => {
    for (const [width, height] of [[384, 801], [360, 343], [1280, 748]]) {
      const ctx = home(width, height, { seat: { player: flick, here: true } });
      const box = bounds(painted(ctx));
      expect(box.right).toBeLessThanOrEqual(width + 1);
      expect(box.bottom).toBeLessThanOrEqual(height + 1);
      expect(texts(ctx)).toEqual([]);
      expect(ctx.depth).toBe(0);
    }
  });

  it("keeps a clear strip at the top for the sound buttons: the stage's details start under it", () => {
    let band = null;
    home(384, 801, { stage: (ctx, area) => (band = area) });
    const speaker = homeLayout(384, 801, { variants: ["one"], rival: false, fill: true }).targets.find((target) => target.kind === "speaker");
    expect(band.y).toBeGreaterThanOrEqual(speaker.y + speaker.h);
    expect(band.w).toBe(384);
  });

  it("shows the rival's seat only when there is one, faded while a friend is away, and the pressed control pressed", () => {
    const here = home(384, 801, { seat: { player: flick, here: true } });
    const away = home(384, 801, { seat: { player: me, here: false, away: true } });
    expect(shapes(here)).not.toEqual(shapes(away));
    expect(away.calls.some((call) => call.name === "globalAlpha" && call.value < 0.6)).toBe(true);
    expect(colours(home(384, 801, { press: { kind: "play", value: "play" } }))).toContain(UI.pressed);
  });

  it("unfolds the volume line when the speaker is open", () => {
    expect(shapes(home(384, 801, { open: true }))).not.toEqual(shapes(home(384, 801)));
  });
});

describe("the looks", () => {
  it("draws the owned looks and wraps the others, marks the chosen one, and writes nothing", () => {
    const layout = looksLayout(384, 801, { kind: "court", count: 3, fill: true, tabs: ["court", "effect"] });
    const options = (owned) => ({ layout, kind: "court", looks: ["a", "b", "c"], owned, chosen: "a", shake: () => 0, drawLook: (ctx, area) => ctx.fillRect(area.x, area.y, 1, 1), drawTab: () => {}, drawWrapped: (ctx, area) => ctx.strokeRect(area.x, area.y, 1, 1) });
    const few = draw((ctx) => drawLooks(ctx, { width: 384, height: 801, press: null }, UI, 0, options(["a"])));
    const more = draw((ctx) => drawLooks(ctx, { width: 384, height: 801, press: null }, UI, 0, options(["a", "b"])));
    expect(few.calls.filter((call) => call.op === "strokeRect")).toHaveLength(2);
    expect(more.calls.filter((call) => call.op === "strokeRect")).toHaveLength(1);
    expect(texts(few)).toEqual([]);
    expect(colours(few)).toContain(UI.accent);
    expect(few.depth).toBe(0);
  });

  it("wraps a present that shakes when touched, in the game's own colours", () => {
    const still = draw((ctx) => drawPresent(ctx, { x: 0, y: 0, w: 80, h: 80 }, 0, present));
    const shaking = draw((ctx) => drawPresent(ctx, { x: 0, y: 0, w: 80, h: 80 }, 0.3, present));
    expect(shapes(still)).not.toEqual(shapes(shaking));
    expect(new Set(colours(still))).toEqual(new Set(["box", "lid", "ribbon", "ink"]));
    expect(still.depth).toBe(0);
  });
});

describe("the pause and the invitation", () => {
  it("shade the screen and draw their buttons, the main one in the accent, without words", () => {
    const pause = draw((ctx) => drawPause(ctx, { width: 384, height: 801, press: null }, UI, { layout: pauseLayout(384, 801, { fill: true }) }));
    expect(colours(pause)).toEqual(expect.arrayContaining([UI.shade, UI.accent, UI.onAccent]));
    expect(texts(pause)).toEqual([]);
    const prompt = draw((ctx) => drawPrompt(ctx, { width: 384, height: 801, press: null }, UI, 0, { layout: promptLayout(384, 801, { fill: true }), player: me }));
    expect(colours(prompt)).toEqual(expect.arrayContaining([UI.shade, UI.surface, UI.accent]));
    expect(texts(prompt)).toEqual([]);
    expect(prompt.depth).toBe(0);
  });
});

describe("the hint hand", () => {
  it("is light with a dark outline in every theme, and presses in time", () => {
    for (const name of ["mono-light", "mono-dark"]) {
      const ui = themeFromTokens(tokensFor(name));
      const ctx = draw((pen) => drawHintHand(pen, 100, 100, 64, 0.2, ui));
      expect(colours(ctx)).toEqual(expect.arrayContaining([ui.paper, ui.ink, ui.halo]));
      expect(ctx.depth).toBe(0);
    }
    const one = shapes(draw((pen) => drawHintHand(pen, 100, 100, 64, 0, UI)));
    const two = shapes(draw((pen) => drawHintHand(pen, 100, 100, 64, 0.25, UI)));
    expect(one).not.toEqual(two);
  });
});

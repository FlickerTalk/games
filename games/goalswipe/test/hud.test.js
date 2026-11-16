import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { eachSize } from "../../../kit/test/canvas/sizes.js";
import { drawPlayBar, drawTally } from "../src/hud.js";
import { playLayout } from "../src/layout.js";
import { THEME } from "../src/theme.js";

const { ui } = THEME;
const SOUND = { level: "high", music: true, open: false, volume: 1 };
const view = (more = {}) => ({
  lang: "en", sound: SOUND, press: null, shooting: 0,
  people: [{ player: { who: "ari", hair: "none", hairColour: "ink" }, goals: 3 }, { player: { who: "flick" }, goals: 12, thinking: true }],
  tallies: [["goal", "miss", "goal", null, null], ["miss", null, null, null, null]],
  ...more,
});

describe("a tally", () => {
  const AREA = { x: 8, y: 70, w: 102, h: 26 };
  const tally = (marks, options) => draw((ctx) => drawTally(ctx, AREA, marks, ui, options));

  it("is five marks in a capsule of the app's colours: filled for a goal, crossed for a miss, hollow while still to come", () => {
    const ctx = tally(["goal", "miss", null, null, null]);
    expect(ctx.calls.filter((call) => call.op === "arc")).toHaveLength(5);
    expect(colours(ctx).filter((colour) => colour === ui.accent).length).toBeGreaterThanOrEqual(2);
    expect(ctx.calls.filter((call) => call.op === "lineTo")).toHaveLength(2);
    const box = bounds(painted(ctx));
    expect(box.left).toBeGreaterThanOrEqual(AREA.x);
    expect(box.right).toBeLessThanOrEqual(AREA.x + AREA.w);
    expect(ctx.depth).toBe(0);
  });

  it("tells the two sides apart by shape, circles and diamonds, not by colour alone", () => {
    const diamonds = tally(["goal", null, null, null, null], { shape: "diamond" });
    expect(diamonds.calls.filter((call) => call.op === "arc")).toHaveLength(0);
    expect(diamonds.calls.filter((call) => call.op === "closePath").length).toBeGreaterThanOrEqual(5);
  });

  it("outlines the capsule of the side whose turn it is to shoot", () => {
    const edge = (shooting) => colours(tally([null, null, null, null, null], { shooting }))[1];
    expect(edge(true)).toBe(ui.accent);
    expect(edge(false)).toBe(ui.border);
  });
});

describe("the bar of the play screen", () => {
  it("shows both players' faces and goals in digits of 20 px or more, and nothing else in words, inside the bar at every size", () => {
    eachSize(({ width, height, fill }) => {
      const layout = playLayout(width, height, { fill });
      const ctx = draw((pen) => drawPlayBar(pen, layout, view(), THEME, 0.4));
      const texts = ctx.calls.filter((call) => call.op === "fillText");
      expect(texts.map((call) => call.text)).toEqual(["3", "12"]);
      for (const call of texts) {
        expect(call.points[0][0], `${width}x${height}`).toBeGreaterThan(layout.bar.x);
        expect(call.points[0][0], `${width}x${height}`).toBeLessThan(layout.controls.pause.x);
      }
      const sizes = ctx.calls.filter((call) => call.op === "set" && call.name === "font").map((call) => parseFloat(/(\d+)px/.exec(call.value)[1]));
      for (const size of sizes) expect(size).toBeGreaterThanOrEqual(20);
      expect(ctx.depth).toBe(0);
    });
  });

  it("keeps the two players' digits apart on the narrowest room", () => {
    const layout = playLayout(328, 343, {});
    const ctx = draw((pen) => drawPlayBar(pen, layout, view({ people: [{ player: { who: "ari" }, goals: 10 }, { player: { who: "flick" }, goals: 10 }] }), THEME, 0));
    const [mine, theirs] = ctx.calls.filter((call) => call.op === "fillText").map((call) => call.points[0][0]);
    expect(theirs - mine).toBeGreaterThanOrEqual(2 * 28 * 0.55 * 2);
  });

  it("draws the volume line only when it is open", () => {
    const layout = playLayout(384, 801, { fill: true });
    const closed = draw((pen) => drawPlayBar(pen, layout, view(), THEME, 0)).calls.length;
    const open = draw((pen) => drawPlayBar(pen, layout, view({ sound: { ...SOUND, open: true } }), THEME, 0)).calls.length;
    expect(open).toBeGreaterThan(closed);
  });
});

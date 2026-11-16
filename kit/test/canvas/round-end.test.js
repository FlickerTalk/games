import { describe, expect, it } from "vitest";
import { endLayout } from "../../src/canvas/menu-layout.js";
import { drawRoundEnd } from "../../src/canvas/round-end.js";
import { themeFromTokens } from "../../src/canvas/theme.js";
import { bounds, colours, draw, painted } from "./recorder.js";
import { tokensFor } from "./themes.js";

const UI = themeFromTokens(tokensFor("aurora-dark"));
const sound = { level: "high", music: true, open: false, volume: 0.6 };
const me = { who: "ari", hair: "none", hairColour: "ink", name: "" };
const flick = { who: "flick" };
const texts = (ctx) => ctx.calls.filter((call) => call.op === "fillText").map((call) => call.text);
const fontSizes = (ctx) => ctx.calls.filter((call) => call.name === "font").map((call) => Number(/(\d+(?:\.\d+)?)px/.exec(call.value)[1]));
const starPaths = (calls) => calls.filter((call, at) => call.op === "moveTo" && calls[at + 9]?.op === "lineTo" && calls[at + 10]?.op === "closePath");

function end(width, height, result, { press = null, gift = false } = {}) {
  const layout = endLayout(width, height, { gift, fill: false });
  return draw((ctx) => drawRoundEnd(ctx, { width, height, sound, press, lang: "en" }, UI, 1, { layout, result, drawPicture: () => {}, drawGift: () => {} }));
}

describe("the end of a round", () => {
  const solo = { stars: 2, score: 120, best: 180, newBest: false, players: null, gift: null };

  it("shows the stars, the score and the best mark in digits only, every number 20 px or larger", () => {
    const ctx = end(384, 801, solo);
    expect(texts(ctx)).toEqual(expect.arrayContaining(["120", "180"]));
    for (const text of texts(ctx)) expect(text).toMatch(/^[\d,]+$/);
    expect(Math.min(...fontSizes(ctx))).toBeGreaterThanOrEqual(20);
    expect(starPaths(ctx.calls).length).toBeGreaterThanOrEqual(3);
    expect(ctx.depth).toBe(0);
  });

  it("shows a plain result with no stars for a serious game", () => {
    const ctx = end(384, 801, { ...solo, stars: null });
    expect(texts(ctx)).toContain("120");
    expect(starPaths(ctx.calls)).toHaveLength(1);
  });

  it("puts both players side by side with their scores when there is a rival", () => {
    const versus = { ...solo, players: [{ player: me, score: 120 }, { player: flick, score: 96 }] };
    for (const [width, height] of [[384, 801], [328, 343], [844, 338]]) {
      const ctx = end(width, height, versus);
      expect(texts(ctx), `${width}x${height}`).toEqual(expect.arrayContaining(["120", "96"]));
      const at = (text) => ctx.calls.find((call) => call.op === "fillText" && call.text === text).points[0];
      expect(Math.abs(at("120")[1] - at("96")[1]), `${width}x${height}`).toBeLessThan(2);
      expect(at("120")[0], `${width}x${height}`).toBeLessThan(at("96")[0]);
    }
    const waiting = end(384, 801, { ...versus, players: [versus.players[0], { player: me, score: null, thinking: true }] });
    expect(texts(waiting)).not.toContain("96");
  });

  it("keeps the card and its buttons inside a small room, and the sound buttons above the shade", () => {
    const ctx = end(328, 343, solo, { gift: true });
    const box = bounds(painted(ctx));
    expect(box.right).toBeLessThanOrEqual(329);
    expect(box.bottom).toBeLessThanOrEqual(344);
    const shade = ctx.calls.findLastIndex((call) => call.op === "fillRect" && call.points[0][0] === 0 && call.points[1][0] === 328);
    expect(shade).toBeGreaterThanOrEqual(0);
    const music = endLayout(328, 343, { gift: true }).targets.find((target) => target.kind === "music");
    const after = ctx.calls.slice(shade).filter((call) => call.op === "arc").map((call) => call.points[0]);
    expect(after.some(([x, y]) => Math.abs(x - (music.x + music.w / 2)) < 1 && Math.abs(y - (music.y + music.h / 2)) < 1)).toBe(true);
    expect(colours(end(384, 801, solo, { press: { kind: "again", value: "again" } }))).toContain(UI.pressed);
  });
});

import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { arcPoint, drawBucket, drawCharm, drawLineAndHook, drawMoments, drawSplash, drawStarFlight } from "../src/gear.js";
import { THEME } from "../src/theme.js";

const { art } = THEME;

describe("the line, the hook and its charm", () => {
  it("hang from the rod's tip down to the hook, with the chosen charm just above it", () => {
    const ctx = draw((pen) => drawLineAndHook(pen, { x: 100, y: 50 }, { x: 160, y: 300 }, 28, "heart", THEME, { time: 0 }));
    const box = bounds(painted(ctx));
    expect(box.top).toBeCloseTo(50, 0);
    expect(box.bottom).toBeLessThanOrEqual(300 + 28);
    expect(box.bottom).toBeGreaterThan(300);
    expect(colours(ctx)).toContain(art.hook.line);
    expect(colours(ctx)).toContain(art.hook.metal);
    expect(colours(ctx)).toContain(art.charms.heart);
    expect(ctx.depth).toBe(0);
  });

  it("can be told apart by its charm: a star, a heart or a flower, each its own shape", () => {
    const looks = ["star", "heart", "flower"].map((charm) => shapes(draw((pen) => drawCharm(pen, 0, 0, 20, charm, THEME, 0))).join("\n"));
    expect(new Set(looks).size).toBe(3);
    expect(colours(draw((pen) => drawCharm(pen, 0, 0, 20, "flower", THEME, 0)))).toContain(art.charms.flower);
    expect(shapes(draw((pen) => drawCharm(pen, 0, 0, 20, "unknown", THEME, 0)))).toEqual(shapes(draw((pen) => drawCharm(pen, 0, 0, 20, "star", THEME, 0))));
  });

  it("draws Flick's line in its own colour", () => {
    expect(colours(draw((pen) => drawLineAndHook(pen, { x: 0, y: 0 }, { x: 0, y: 100 }, 28, "star", THEME, { flick: true })))).toContain(art.hook.flick);
  });
});

describe("the bucket", () => {
  it("stands where it is put, and shows the creatures that just jumped in peeking out", () => {
    const empty = draw((pen) => drawBucket(pen, 200, 100, 64, THEME, { peeking: [] }));
    const full = draw((pen) => drawBucket(pen, 200, 100, 64, THEME, { peeking: [0, 6] }));
    expect(colours(empty)).toContain(art.bucket.body);
    expect(full.calls.length).toBeGreaterThan(empty.calls.length);
    expect(colours(full)).toContain(art.creatures[6]);
    const box = bounds(painted(empty));
    expect(box.left).toBeGreaterThanOrEqual(200 - 64 * 0.55);
    expect(box.right).toBeLessThanOrEqual(200 + 64 * 0.55);
  });
});

describe("what answers a catch", () => {
  it("is a splash that grows and fades once, and nothing before or after it", () => {
    expect(draw((pen) => drawSplash(pen, 0, 0, 60, 0, THEME)).calls).toHaveLength(0);
    expect(draw((pen) => drawSplash(pen, 0, 0, 60, 1, THEME)).calls).toHaveLength(0);
    const early = bounds(painted(draw((pen) => drawSplash(pen, 0, 0, 60, 0.2, THEME))));
    const late = bounds(painted(draw((pen) => drawSplash(pen, 0, 0, 60, 0.7, THEME))));
    expect(late.right - late.left).toBeGreaterThan(early.right - early.left);
  });

  it("is a jump along an arc from the water to the bucket, above both on the way", () => {
    const from = { x: 150, y: 300 };
    const to = { x: 200, y: 200 };
    expect(arcPoint(from, to, 0, 80)).toMatchObject({ x: 150, y: 300 });
    expect(arcPoint(from, to, 1, 80)).toMatchObject({ x: 200, y: 200 });
    expect(arcPoint(from, to, 0.5, 80).y).toBeLessThan(200);
    expect(arcPoint(from, to, 2, 80)).toMatchObject({ x: 200, y: 200 });
  });

  it("is a few stars flying to the score, gone once they arrive", () => {
    const ctx = draw((pen) => drawStarFlight(pen, { x: 150, y: 300 }, { x: 30, y: 30 }, 22, 0.5, THEME));
    expect(colours(ctx)).toContain(art.star);
    const box = bounds(painted(ctx));
    expect(box.left).toBeGreaterThan(0);
    expect(box.bottom).toBeLessThan(320);
    expect(draw((pen) => drawStarFlight(pen, { x: 150, y: 300 }, { x: 30, y: 30 }, 22, 1, THEME)).calls).toHaveLength(0);
  });
});

describe("the moments after a catch", () => {
  const jump = { kind: "jump", what: 6, from: { x: 150, y: 300 }, to: { x: 200, y: 200 }, size: 50, start: 1000, duration: 700 };

  it("draw the creature along its jump while it lasts, and nothing before it starts or once it is over", () => {
    const during = draw((pen) => drawMoments(pen, [jump], THEME, 1.35));
    expect(colours(during)).toContain(art.creatures[6]);
    const box = bounds(painted(during));
    expect(box.left).toBeGreaterThan(100);
    expect(box.right).toBeLessThan(260);
    expect(draw((pen) => drawMoments(pen, [jump], THEME, 0.9)).calls).toHaveLength(0);
    expect(draw((pen) => drawMoments(pen, [jump], THEME, 1.8)).calls).toHaveLength(0);
  });

  it("draw a sticker flying to the album, a creature hopping back into the water and a find opening", () => {
    const moments = [
      { kind: "sticker", what: 12, from: { x: 200, y: 200 }, to: { x: 300, y: 30 }, size: 50, start: 0, duration: 1000 },
      { kind: "release", what: 3, from: { x: 200, y: 200 }, to: { x: 120, y: 260 }, size: 50, start: 0, duration: 1000 },
      { kind: "find", what: "chest", at: { x: 200, y: 200 }, size: 50, start: 0, duration: 1000 },
      { kind: "stars", from: { x: 200, y: 200 }, to: { x: 20, y: 20 }, start: 0, duration: 1000 },
      { kind: "splash", x: 100, y: 220, size: 40, start: 0, duration: 1000 },
    ];
    const seen = colours(draw((pen) => drawMoments(pen, moments, THEME, 0.5)));
    for (const colour of [art.creatures[12], art.creatures[3], art.finds.chest, art.star, art.splash.drop]) expect(seen).toContain(colour);
  });
});

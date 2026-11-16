import { afterEach, describe, expect, it, vi } from "vitest";
import { recorder } from "../../../kit/test/canvas/recorder.js";
import { createSprites } from "../src/sprites.js";

const BOX = { x: 10, y: 20, w: 60, h: 84 };

function board() {
  const ctx = recorder();
  ctx.drawImage = (image, x, y, w, h) => ctx.calls.push({ op: "drawImage", image, points: [[x, y], [x + w, y + h]] });
  return ctx;
}

function canvases() {
  const made = [];
  const make = vi.fn((width, height) => {
    const canvas = { width, height, pen: recorder() };
    canvas.getContext = () => canvas.pen;
    made.push(canvas);
    return canvas;
  });
  return { made, make };
}

const paintCard = (ctx) => {
  ctx.beginPath();
  ctx.rect(0, 0, 60, 84);
  ctx.fill();
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the cards drawn once and copied", () => {
  it("falls back to a canvas of the page where an offscreen one cannot draw", () => {
    vi.stubGlobal("OffscreenCanvas", class { getContext() { return null; } });
    const pen = recorder();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => pen);
    const sprites = createSprites();
    const ctx = board();
    sprites.draw(ctx, "c1", BOX, paintCard, 2);
    const copy = ctx.calls.find((call) => call.op === "drawImage");
    expect(copy.image).toBeInstanceOf(HTMLCanvasElement);
    expect([copy.image.width, copy.image.height]).toEqual([120, 168]);
    expect(pen.calls.some((call) => call.op === "fill")).toBe(true);
  });

  it("paints straight onto the board, at its place, where no canvas of its own can be made", () => {
    const sprites = createSprites({ make: () => null });
    const ctx = board();
    sprites.draw(ctx, "c1", BOX, paintCard, 3);
    expect(ctx.calls.find((call) => call.op === "rect").points).toEqual([[10, 20], [70, 104]]);
    expect(ctx.depth).toBe(0);
  });

  it("paints a card once at the screen's pixel ratio and copies it after that", () => {
    const { made, make } = canvases();
    const sprites = createSprites({ make });
    const ctx = board();
    const paint = vi.fn(paintCard);
    sprites.draw(ctx, "c1", BOX, paint, 3);
    sprites.draw(ctx, "c1", { ...BOX, x: 200 }, paint, 3);
    expect(paint).toHaveBeenCalledTimes(1);
    expect([made[0].width, made[0].height]).toEqual([180, 252]);
    const copies = ctx.calls.filter((call) => call.op === "drawImage");
    expect(copies.map((call) => call.points)).toEqual([[[10, 20], [70, 104]], [[200, 20], [260, 104]]]);
    expect(copies[0].image).toBe(made[0]);
    expect(made[0].pen.calls.some((call) => call.op === "fill")).toBe(true);
  });

  it("paints again for another size or another look, and forgets everything when asked", () => {
    const { make } = canvases();
    const sprites = createSprites({ make });
    const ctx = board();
    sprites.draw(ctx, "c1", BOX, paintCard, 2);
    sprites.draw(ctx, "c1", { ...BOX, w: 90, h: 126 }, paintCard, 2);
    sprites.draw(ctx, "c2", BOX, paintCard, 2);
    expect(make).toHaveBeenCalledTimes(3);
    sprites.clear();
    sprites.draw(ctx, "c1", BOX, paintCard, 2);
    expect(make).toHaveBeenCalledTimes(4);
  });

  it("draws a card that changes size on its way from one picture, painted once at the size it is told", () => {
    const { made, make } = canvases();
    const sprites = createSprites({ make });
    const ctx = board();
    const paint = vi.fn(paintCard);
    for (const w of [60, 63, 67, 70]) sprites.draw(ctx, "c1", { x: 0, y: 0, w, h: w * 1.4 }, paint, 3, { w: 70, h: 98 });
    expect(paint).toHaveBeenCalledTimes(1);
    expect([made[0].width, made[0].height]).toEqual([210, 294]);
    expect(ctx.calls.filter((call) => call.op === "drawImage").map((call) => call.points[1][0])).toEqual([60, 63, 67, 70]);
  });

  it("keeps a bounded number of pictures", () => {
    const { make } = canvases();
    const sprites = createSprites({ make, most: 8 });
    const ctx = board();
    for (let one = 0; one < 30; one += 1) sprites.draw(ctx, `c${one}`, BOX, paintCard, 1);
    expect(sprites.size).toBeLessThanOrEqual(8);
  });
});

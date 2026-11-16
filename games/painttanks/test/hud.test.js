import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { drawDial, drawDiveButton, drawFireButton, drawTurnMarker, drawWindFlag } from "../src/hud.js";
import { THEME } from "../src/theme.js";

const ui = THEME.ui;
const area = { x: 10, y: 10, w: 88, h: 88 };
const texts = (ctx) => ctx.calls.filter((call) => call.op === "fillText").map((call) => call.text);
const fonts = (ctx) => ctx.calls.filter((call) => call.op === "set" && call.name === "font").map((call) => Number(/(\d+)px/.exec(call.value)[1]));

describe("the aiming controls", () => {
  it("show the angle and the power as digits of 20 px or more, inside their button", () => {
    const angle = draw((ctx) => drawDial(ctx, area, 45, "angle", ui, { lang: "en" }));
    const power = draw((ctx) => drawDial(ctx, area, 72, "power", ui, { lang: "en" }));
    expect(texts(angle)).toEqual(["45"]);
    expect(texts(power)).toEqual(["72"]);
    for (const ctx of [angle, power]) {
      expect(Math.min(...fonts(ctx))).toBeGreaterThanOrEqual(20);
      const box = bounds(painted(ctx));
      expect(box.left).toBeGreaterThanOrEqual(area.x);
      expect(box.right).toBeLessThanOrEqual(area.x + area.w);
    }
    expect(shapes(angle)).not.toEqual(shapes(draw((ctx) => drawDial(ctx, area, 80, "angle", ui, { lang: "en" }))));
    expect(texts(draw((ctx) => drawDial(ctx, area, -12, "torpedo", ui, { lang: "en" })))).toEqual(["-12"]);
  });

  it("press the shoot and dive buttons at once, grey the shoot button out while waiting, and turn the dive arrow under water", () => {
    const fire = { x: 0, y: 0, w: 120, h: 120 };
    expect(colours(draw((ctx) => drawFireButton(ctx, fire, ui, { pressed: true })))).not.toEqual(colours(draw((ctx) => drawFireButton(ctx, fire, ui, {}))));
    expect(colours(draw((ctx) => drawFireButton(ctx, fire, ui, { waiting: true })))).toContain(ui.muted);
    expect(shapes(draw((ctx) => drawDiveButton(ctx, area, ui, { under: true })))).not.toEqual(shapes(draw((ctx) => drawDiveButton(ctx, area, ui, { under: false }))));
  });

  it("fly the wind flag the way the wind blows, longer when it blows harder", () => {
    const right = bounds(painted(draw((ctx) => drawWindFlag(ctx, 100, 100, 50, 0.8, 0, ui))));
    const left = bounds(painted(draw((ctx) => drawWindFlag(ctx, 100, 100, 50, -0.8, 0, ui))));
    const calm = bounds(painted(draw((ctx) => drawWindFlag(ctx, 100, 100, 50, 0.2, 0, ui))));
    expect(right.right).toBeGreaterThan(calm.right);
    expect(left.left).toBeLessThan(100 - 20);
  });

  it("mark whose turn it is with the player's circle or the rival's diamond", () => {
    expect(shapes(draw((ctx) => drawTurnMarker(ctx, 50, 50, 40, 0, 0, ui)))).not.toEqual(shapes(draw((ctx) => drawTurnMarker(ctx, 50, 50, 40, 1, 0, ui))));
  });
});

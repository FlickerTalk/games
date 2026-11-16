import { describe, expect, it } from "vitest";
import { bounds, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { ICONS, drawCommandButton, drawIcon, drawStrip, stripSlots } from "../src/command-art.js";
import { THEME } from "../src/theme.js";

const AREA = { x: 8, y: 400, w: 368, h: 100 };
const lines = (ctx) => shapes(ctx).join("\n");
const texts = (ctx) => ctx.calls.filter((call) => call.op === "fillText").map((call) => call.text);

describe("the command icons", () => {
  it("are drawn by code, each its own shape, inside their square, with digits only for the rings", () => {
    const drawn = ICONS.map((icon) => draw((ctx) => drawIcon(ctx, icon, 50, 50, 40, THEME.ui.text)));
    expect(new Set(drawn.map(lines)).size).toBe(ICONS.length);
    for (const [at, ctx] of drawn.entries()) {
      const box = bounds(painted(ctx));
      expect(box.left, ICONS[at]).toBeGreaterThanOrEqual(30 - 1);
      expect(box.right, ICONS[at]).toBeLessThanOrEqual(70 + 1);
      expect(ctx.depth).toBe(0);
      for (const text of texts(ctx)) expect(text, ICONS[at]).toMatch(/^\d$/);
    }
    expect(ICONS).toEqual(expect.arrayContaining(["F", "L", "R", "U", "ring2", "ring3", "close", "undo", "play", "stop", "send"]));
  });

  it("sit on round buttons in the app's colours, with a look of their own while pressed", () => {
    const target = { x: 100, y: 100, w: 88, h: 88 };
    const plain = draw((ctx) => drawCommandButton(ctx, target, "F", THEME, {}));
    expect(bounds(painted(plain)).left).toBeGreaterThanOrEqual(100);
    expect(lines(draw((ctx) => drawCommandButton(ctx, target, "F", THEME, { pressed: true })))).not.toBe(lines(plain));
  });
});

describe("the strip", () => {
  it("lays out a slot for every command and one more, growing rows when it fills up", () => {
    const few = stripSlots(AREA, 3);
    expect(few.length).toBeGreaterThanOrEqual(4);
    const many = stripSlots(AREA, 20);
    expect(many).toHaveLength(20);
    expect(new Set(many.map((slot) => slot.y)).size).toBeGreaterThan(1);
    for (const slot of [...few, ...many]) {
      expect(slot.x - slot.size / 2).toBeGreaterThanOrEqual(AREA.x);
      expect(slot.x + slot.size / 2).toBeLessThanOrEqual(AREA.x + AREA.w);
      expect(slot.y + slot.size / 2).toBeLessThanOrEqual(AREA.y + AREA.h);
      expect(slot.size).toBeGreaterThanOrEqual(24);
    }
  });

  it("shows the running slot, the wrong one, and the ring around its commands with how many times", () => {
    const items = ["F", { times: 3, body: ["F", "R"] }, "L"];
    const still = draw((ctx) => drawStrip(ctx, AREA, { items, open: false }, {}, THEME, 0));
    expect(lines(draw((ctx) => drawStrip(ctx, AREA, { items, open: false }, { running: 1 }, THEME, 0)))).not.toBe(lines(still));
    expect(lines(draw((ctx) => drawStrip(ctx, AREA, { items, open: false }, { wrong: 3 }, THEME, 0)))).not.toBe(lines(still));
    expect(texts(still)).toContain("3");
    expect(still.depth).toBe(0);
    const box = bounds(painted(still));
    expect(box.left).toBeGreaterThanOrEqual(AREA.x - 1);
    expect(box.bottom).toBeLessThanOrEqual(AREA.y + AREA.h + 1);
  });
});

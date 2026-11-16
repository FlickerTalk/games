import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawBoat, drawFleetChip, drawSideMark, sideMark } from "../src/pieces.js";
import { themeFor } from "../src/theme.js";

const theme = themeFor(null, { dark: false });
const dark = themeFor(null, { dark: true });
const CELL = 30;
const boat = (options, length = 3) => draw((ctx) => drawBoat(ctx, theme, 200, 200, length, CELL, options));
const polygons = (ctx, corners) => {
  let found = 0;
  let run = 0;
  for (const call of ctx.calls) {
    if (call.op === "moveTo") run = 1;
    else if (call.op === "lineTo" && run) run += 1;
    else if (call.op === "closePath") {
      if (run === corners) found += 1;
      run = 0;
    } else if (call.op !== "set") run = 0;
  }
  return found;
};
const ellipses = (ctx) => ctx.calls.filter((call) => call.op === "ellipse").length;
const alphas = (ctx) => ctx.calls.filter((call) => call.op === "set" && call.name === "globalAlpha").map((call) => call.value);

describe("a toy boat", () => {
  it("lies along its cells, across or down, and stays within them but for the cabin and the flag that rise above", () => {
    for (const length of [2, 3, 5]) {
      const across = bounds(painted(boat({ side: 0 }, length)));
      expect(across.left).toBeGreaterThanOrEqual(200 - (length * CELL) / 2);
      expect(across.right).toBeLessThanOrEqual(200 + (length * CELL) / 2);
      expect(across.bottom).toBeLessThanOrEqual(200 + CELL / 2);
      expect(across.top).toBeGreaterThanOrEqual(200 - CELL * 0.75);
      const down = bounds(painted(boat({ side: 1, vertical: true }, length)));
      expect(down.top).toBeGreaterThanOrEqual(200 - (length * CELL) / 2);
      expect(down.bottom).toBeLessThanOrEqual(200 + (length * CELL) / 2);
      expect(down.right - down.left).toBeLessThan(CELL * 1.3);
    }
  });

  it("tells the sides apart by shape as well as colour: a flag on the yellow boat, a funnel on the purple tug", () => {
    const [yellow, purple] = [boat({ side: 0 }), boat({ side: 1 })];
    expect(polygons(yellow, 3)).toBe(1);
    expect(polygons(purple, 3)).toBe(0);
    expect(colours(yellow)).toContain(theme.boats[0].body);
    expect(colours(purple)).toContain(theme.boats[1].body);
    expect(colours(purple)).toContain(theme.boats[1].dark);
  });

  it("laughs only once it is found, tipped over and bobbing a little", () => {
    expect(ellipses(boat({ side: 0 }))).toBe(0);
    const found = boat({ side: 0, laugh: true, tilt: -0.12 });
    expect(ellipses(found)).toBeGreaterThanOrEqual(2);
    expect(found.depth).toBe(0);
    expect(boat({ side: 1 }).depth).toBe(0);
  });

  it("shows faded when asked, for a fleet seen only after the round", () => {
    expect(alphas(boat({ side: 1, alpha: 0.6 }))).toContain(0.6);
  });
});

describe("a boat's chip in the fleet's row", () => {
  const box = { x: 100, y: 100, w: 60, h: 12 };
  const chip = (options, pen = theme) => draw((ctx) => drawFleetChip(ctx, pen, box, 4, options));

  it("is an outline with one notch between each two of its cells, in the page's quiet colour while afloat", () => {
    const afloat = chip({ found: false, side: 0 });
    expect(colours(afloat)).toContain(theme.ui.muted);
    expect(colours(afloat)).not.toContain(theme.boats[0].light);
    const area = bounds(painted(afloat));
    expect(area.left).toBeGreaterThanOrEqual(box.x - 1);
    expect(area.right).toBeLessThanOrEqual(box.x + box.w + 1);
  });

  it("fills in the side's colour and is struck through in paint once found, tipped but still inside its box", () => {
    const found = chip({ found: true, side: 1 });
    expect(colours(found)).toEqual(expect.arrayContaining([theme.boats[1].light, theme.marks.paint]));
    const area = bounds(painted(found));
    expect(area.left).toBeGreaterThanOrEqual(box.x - 2);
    expect(area.right).toBeLessThanOrEqual(box.x + box.w + 2);
    expect(area.top).toBeGreaterThanOrEqual(box.y - box.h);
    expect(area.bottom).toBeLessThanOrEqual(box.y + box.h * 2);
    expect(found.depth).toBe(0);
  });

  it("keeps a found chip and a side's mark in their full colour on a dark page, with no grey rim to wash them out", () => {
    const found = colours(chip({ found: true, side: 0 }, dark));
    expect(found).toContain(dark.boats[0].light);
    expect(found).not.toContain(dark.rim);
    for (const side of [0, 1]) expect(colours(draw((ctx) => drawSideMark(ctx, dark, 50, 50, 24, side)))).not.toContain(dark.rim);
  });
});

describe("the mark of a side", () => {
  it("is a yellow disc with a flag for one side and a purple diamond with a cabin for the other, on the canvas", () => {
    const [yellow, purple] = [0, 1].map((side) => draw((ctx) => drawSideMark(ctx, theme, 50, 50, 24, side)));
    expect(polygons(yellow, 4)).toBe(0);
    expect(polygons(purple, 4)).toBeGreaterThanOrEqual(1);
    for (const mark of [yellow, purple]) {
      const area = bounds(painted(mark));
      expect(area.left).toBeGreaterThanOrEqual(50 - 13);
      expect(area.right).toBeLessThanOrEqual(50 + 13);
      expect(mark.depth).toBe(0);
    }
  });

  it("is the same drawing beside a player's name, hidden from screen readers", () => {
    const [yellow, purple] = [sideMark(0), sideMark(1)];
    expect(yellow).not.toBe(purple);
    for (const mark of [yellow, purple]) {
      expect(mark).toMatch(/^<svg [^>]*aria-hidden="true"/);
      expect(mark).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
    }
    expect(purple).toContain("<polygon");
    expect(yellow).toContain("<circle");
    expect(yellow).toContain(theme.boats[0].body);
    expect(purple).toContain(theme.boats[1].body);
  });
});

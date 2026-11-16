import { describe, expect, it } from "vitest";
import { cellCentre } from "../../../kit/src/tabletop/grid.js";
import { bounds, colours, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { aimSize, confirmBox, drawBoard, layoutFor } from "../src/paint.js";
import { DEFAULT_FLEET } from "../src/rules.js";
import { themeFor } from "../src/theme.js";

const light = themeFor(null, { dark: false });
const dark = themeFor(null, { dark: true });
const SIZES = [120, 160, 214, 260, 300, 320, 352, 400, 480, 600, 720];
const OTHER = DEFAULT_FLEET.map((ship) => ({ ...ship, start: ship.start + 10 }));

const outer = ({ frame }) => frame.outer;
const disc = ({ x, y, d }) => ({ x: x - d / 2, y: y - d / 2, w: d, h: d });
const markBox = ({ x, y, size }) => ({ x: x - size / 2, y: y - size / 2, w: size, h: size });
const apart = (one, two) => one.x + one.w <= two.x + 0.01 || two.x + two.w <= one.x + 0.01 || one.y + one.h <= two.y + 0.01 || two.y + two.h <= one.y + 0.01;
const inside = (box, size) => box.x >= -0.01 && box.y >= -0.01 && box.x + box.w <= size + 0.01 && box.y + box.h <= size + 0.01;
const allApart = (boxes) => boxes.every((one, at) => boxes.slice(at + 1).every((two) => apart(one, two)));

function placing(extra = {}) {
  return { mode: "place", time: 0, me: 0, place: { ships: DEFAULT_FLEET, controls: { enabled: true } }, ...extra };
}

function firing(extra = {}) {
  const shots = new Map([[0, "m"], [41, "h"], [21, "s"], [22, "s"], [23, "s"], [24, "s"], [25, "s"], [99, null]]);
  return {
    mode: "fire",
    time: 0,
    me: 0,
    theirs: { shots, found: [OTHER[0]], shown: [], open: [5, 6, 7], last: 99, pending: 99, chosen: 55, effects: [] },
    mine: { ships: DEFAULT_FLEET.map((ship) => ({ ship, found: ship.start === 58 })), shots: new Map([[58, "s"], [68, "s"], [1, "m"]]), last: 68, effects: [] },
    rows: [{ side: 1, found: [5], count: "1/5" }, { side: 0, found: [2], count: "1/5" }],
    ...extra,
  };
}

describe("the Sea Battle board, laid out", () => {
  it("places the user's sea above the shuffle and ready buttons while the fleet is placed, apart and inside the board at every size", () => {
    for (const size of SIZES) {
      const { place } = layoutFor(size);
      const boxes = [outer(place.sea), disc(place.shuffle), disc(place.ready)];
      for (const box of boxes) expect(inside(box, size), `${size}`).toBe(true);
      expect(allApart(boxes), `${size}`).toBe(true);
      expect(place.ready.d).toBeGreaterThanOrEqual(place.shuffle.d);
      if (size >= 300) expect(place.shuffle.d, `${size}`).toBeGreaterThanOrEqual(44);
    }
  });

  it("gives the other side's sea most of the board, the user's own sea and the two fleets' rows below it, nothing overlapping", () => {
    for (const size of SIZES) {
      const { fire } = layoutFor(size);
      const rows = fire.rows.map((row) => row.box);
      const seas = [outer(fire.theirs), outer(fire.mine)];
      for (const box of [...seas, ...rows]) expect(inside(box, size), `${size}`).toBe(true);
      expect(allApart([...seas, ...rows]), `${size}`).toBe(true);
      expect(fire.theirs.grid.cell).toBeGreaterThan(fire.mine.grid.cell * 2.5);
      expect(fire.theirs.grid.cell * 10).toBeGreaterThan(size * 0.58);
    }
  });

  it("keeps each fleet row's mark, boats and count apart at every size, the count big enough to read or left out", () => {
    for (const size of SIZES) {
      for (const row of layoutFor(size).fire.rows) {
        const parts = [markBox(row.mark), ...row.chips, ...(row.count ? [row.count] : [])];
        for (const part of parts) expect(inside(part, size) && part.y >= row.box.y - 0.01 && part.y + part.h <= row.box.y + row.box.h + 0.01, `${size}`).toBe(true);
        expect(allApart(parts), `${size}`).toBe(true);
        expect(row.chips.map((chip) => chip.length)).toEqual([5, 4, 3, 3, 2]);
        expect(row.chips[0].w).toBeGreaterThan(row.chips[4].w);
        if (row.count) expect(row.count.font, `${size}`).toBeGreaterThanOrEqual(11);
        if (size >= 320) expect(row.count?.font, `${size}`).toBeGreaterThanOrEqual(20);
      }
    }
  });

  it("offers a confirming target at least 44 px wide around the chosen cell, inside the other side's sea", () => {
    for (const size of [214, 320, 352, 720]) {
      const layout = layoutFor(size);
      for (const cell of [0, 9, 45, 90, 99]) {
        const box = confirmBox(layout, cell);
        const { x, y } = cellCentre(layout.fire.theirs.grid, cell);
        expect(box.w).toBeGreaterThanOrEqual(Math.min(44, layout.fire.theirs.frame.outer.w));
        expect(box.x <= x && x <= box.x + box.w && box.y <= y && y <= box.y + box.h).toBe(true);
        const sea = layout.fire.theirs.frame.outer;
        expect(box.x >= sea.x - 0.01 && box.y >= sea.y - 0.01 && box.x + box.w <= sea.x + sea.w + 0.01 && box.y + box.h <= sea.y + sea.h + 0.01).toBe(true);
      }
    }
  });
});

describe("the Sea Battle board, drawn", () => {
  it("draws inside its square at every size the room or a full screen can give, placing or firing", () => {
    for (const size of SIZES) {
      for (const view of [placing({ size }), firing({ size }), placing({ size, place: { ships: DEFAULT_FLEET, controls: null } })]) {
        const ctx = draw((pen) => drawBoard(pen, light, view));
        const area = bounds(painted(ctx));
        expect(area.left, `${size} ${view.mode}`).toBeGreaterThanOrEqual(0);
        expect(area.top, `${size} ${view.mode}`).toBeGreaterThanOrEqual(0);
        expect(area.right, `${size} ${view.mode}`).toBeLessThanOrEqual(size);
        expect(area.bottom, `${size} ${view.mode}`).toBeLessThanOrEqual(size);
        expect(ctx.depth).toBe(0);
      }
    }
  });

  it("keeps the aiming target inside the board even on a cell at its edge", () => {
    for (const size of [214, 352]) {
      const layout = layoutFor(size);
      for (const cell of [0, 9, 90, 99]) {
        const centre = cellCentre(layout.fire.theirs.grid, cell);
        const reach = aimSize(layout, cell) / 2;
        expect(centre.x - reach).toBeGreaterThanOrEqual(0);
        expect(centre.y - reach).toBeGreaterThanOrEqual(0);
        expect(centre.x + reach).toBeLessThanOrEqual(size);
        expect(aimSize(layout, 45)).toBeGreaterThanOrEqual(Math.min(52, layout.fire.theirs.grid.cell * 3));
      }
    }
  });

  it("writes the counts in the page's text colour, and gives the seas a light rim on a dark page only", () => {
    const counts = draw((pen) => drawBoard(pen, light, firing({ size: 352 }))).calls.filter((call) => call.op === "fillText");
    expect(counts.map((call) => call.text)).toEqual(["1/5", "1/5"]);
    const strokes = (theme) => colours(draw((ctx) => drawBoard(ctx, theme, firing({ size: 352 }))));
    expect(strokes(dark)).toContain(dark.rim);
    expect(strokes(light)).not.toContain(dark.rim);
  });

  it("dims the shuffle and ready buttons while the user may not place, and leaves them out once the fleet is sealed", () => {
    const alphas = (view) => draw((ctx) => drawBoard(ctx, light, view)).calls.filter((call) => call.op === "set" && call.name === "globalAlpha").map((call) => call.value);
    expect(Math.min(...alphas(placing({ size: 352, place: { ships: DEFAULT_FLEET, controls: { enabled: false } } })))).toBeLessThan(0.6);
    const sealed = draw((ctx) => drawBoard(ctx, light, placing({ size: 352, place: { ships: DEFAULT_FLEET, controls: null } })));
    const { place } = layoutFor(352);
    expect(sealed.calls.filter((call) => call.op === "arc" && Math.abs(call.points[0][1] - place.ready.y) < 1)).toHaveLength(0);
  });
});

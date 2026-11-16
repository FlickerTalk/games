import { describe, expect, it } from "vitest";
import { required } from "../src/geometry.js";
import { pageOf } from "../src/pages.js";
import { MAX_POINTS, STAMPS, WIDTHS, addItem, blankDrawing, blankWork, clearZone, eraseAt, fillZone, isFinished, pointsIn, readDrawing, readWork, simplify } from "../src/work.js";

const cat = pageOf("cat");
const line = (pts, extra = {}) => ({ k: "l", p: 3, w: 1, m: 0, pts, ...extra });

describe("a page being coloured", () => {
  it("starts blank, takes a paint per zone and lets a zone be painted again or cleared", () => {
    const blank = blankWork();
    expect(blank).toEqual({ fills: {}, items: [] });
    const one = fillZone(blank, 2, "5");
    expect(one.fills).toEqual({ 2: "5" });
    expect(blank.fills).toEqual({});
    expect(fillZone(one, 2, "r").fills).toEqual({ 2: "r" });
    expect(clearZone(one, 2).fills).toEqual({});
  });

  it("is finished when every zone wide enough for a finger has paint", () => {
    let work = blankWork();
    const asked = required(cat);
    for (const zone of asked.slice(0, -1)) work = fillZone(work, zone, "1");
    expect(isFinished(cat, work)).toBe(false);
    work = fillZone(work, asked.at(-1), "g");
    expect(isFinished(cat, work)).toBe(true);
  });

  it("keeps brush lines and stamps in the order they were made", () => {
    const work = addItem(addItem(blankWork(), line([10, 10, 40, 40])), { k: "s", t: 2, p: 1, x: 50, y: 60, m: 1 });
    expect(work.items.map((item) => item.k)).toEqual(["l", "s"]);
    expect(STAMPS).toEqual(["star", "heart", "flower", "leaf", "paw", "car"]);
    expect(WIDTHS).toEqual([7, 16, 30]);
  });

  it("rubs out the lines and stamps under a finger, mirrored ones by their reflection too", () => {
    let work = addItem(blankWork(), line([10, 10, 100, 10]));
    work = addItem(work, line([10, 200, 20, 200], { m: 1 }));
    work = addItem(work, { k: "s", t: 0, p: 2, x: 150, y: 300, m: 0 });
    expect(eraseAt(work, 60, 14, 8).items).toHaveLength(2);
    expect(eraseAt(work, 60, 40, 8)).toBe(work);
    expect(eraseAt(work, 285, 200, 8).items).toHaveLength(2);
    expect(eraseAt(work, 160, 305, 8).items.some((item) => item.k === "s")).toBe(false);
  });

  it("drops the points of a line closer together than a finger can tell apart, and rounds them", () => {
    expect(simplify([[0, 0], [1, 1], [2.4, 0.2], [10.6, 10], [11, 10.5], [20, 20]])).toEqual([0, 0, 11, 10, 20, 20]);
    expect(simplify([[5, 5]])).toEqual([5, 5, 5, 5]);
    expect(pointsIn(addItem(blankWork(), line([0, 0, 1, 1, 2, 2])))).toBe(3);
  });

  it("is read back from the store as it was saved, and anything malformed is left out", () => {
    const work = addItem(fillZone(fillZone(blankWork(), 0, "3"), 4, "t2"), line([1, 2, 3, 4]));
    expect(readWork(JSON.stringify(work), cat)).toEqual(work);
    const bad = { fills: { 0: "3", 99: "1", x: "2", 3: "zz" }, items: [line([1, 2]), line([1, 2, 3]), { k: "s", t: 9, p: 1, x: 1, y: 1, m: 0 }, line([1, 2, 3, 4], { p: 99 }), line([500, 2, 3, 4])] };
    expect(readWork(JSON.stringify(bad), cat)).toEqual({ fills: { 0: "3" }, items: [line([1, 2])] });
    expect(readWork("not json", cat)).toEqual(blankWork());
    expect(readWork(null, cat)).toEqual(blankWork());
  });

  it("never holds more points than a store key can keep", () => {
    const long = Array.from({ length: 2000 }, (_, at) => [at % 290, Math.floor(at / 290) * 40]).flat();
    let work = blankWork();
    for (let at = 0; at < 6; at += 1) work = addItem(work, line(long));
    expect(pointsIn(work)).toBeLessThanOrEqual(MAX_POINTS);
    expect(JSON.stringify(work).length).toBeLessThan(60_000);
  });
});

describe("a free drawing", () => {
  it("starts on a paper of its own and comes back from the store with it", () => {
    expect(blankDrawing("dark")).toEqual({ paper: "dark", items: [] });
    expect(blankDrawing("blue")).toEqual({ paper: "light", items: [] });
    const drawing = addItem(blankDrawing("cream"), { k: "s", t: 1, p: 9, x: 100, y: 100, m: 1 });
    expect(readDrawing(JSON.stringify(drawing))).toEqual(drawing);
    expect(readDrawing(JSON.stringify({ paper: "gold", items: [] }))).toEqual(blankDrawing("light"));
  });
});

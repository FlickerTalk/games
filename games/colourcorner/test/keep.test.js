import { describe, expect, it, vi } from "vitest";
import { SLOTS, WALL_MOST, addToWall, loadPicture, loadWork, readOwn, readWall, saveDrawing, saveOwn, saveShared, saveWall, saveWork } from "../src/keep.js";
import { pageOf } from "../src/pages.js";
import { addItem, blankDrawing, fillZone, blankWork } from "../src/work.js";

function memory(values = {}) {
  const kept = new Map(Object.entries(values));
  return { kept, get: vi.fn(async (key) => kept.get(key) ?? null), set: vi.fn(async (key, value) => (kept.set(key, value), true)), forget: async (key) => kept.delete(key) };
}

describe("what the game keeps on the phone", () => {
  it("remembers the player's own choices, and starts from the defaults when nothing or nonsense is kept", async () => {
    expect(await readOwn(memory())).toEqual({ variant: "pages", taught: false, colour: 1, pattern: null, done: [], saved: 0, shared: 0 });
    const store = memory();
    await saveOwn(store, { variant: "free", taught: true, colour: 7, pattern: "dots", done: ["cat"], saved: 3, shared: 1 });
    expect(await readOwn(store)).toEqual({ variant: "free", taught: true, colour: 7, pattern: "dots", done: ["cat"], saved: 3, shared: 1 });
    const odd = memory({ colourcorner: JSON.stringify({ variant: "x", taught: "yes", colour: 99, pattern: "plaid", done: ["cat", "nothing", 3], saved: -1 }) });
    expect(await readOwn(odd)).toEqual({ variant: "pages", taught: false, colour: 1, pattern: null, done: ["cat"], saved: 0, shared: 0 });
    const broken = { get: async () => { throw new Error("gone"); } };
    expect((await readOwn(broken)).variant).toBe("pages");
  });

  it("keeps each page's colouring under its own key, small enough for the store", async () => {
    const store = memory();
    const cat = pageOf("cat");
    const work = addItem(fillZone(blankWork(), 2, "5"), { k: "l", p: 1, w: 0, m: 0, pts: [1, 2, 3, 4] });
    await saveWork(store, "cat", work);
    expect([...store.kept.keys()]).toEqual(["page/cat"]);
    expect(await loadWork(store, cat)).toEqual(work);
    expect(await loadWork(memory(), cat)).toEqual(blankWork());
  });

  it("lists the finished pictures newest first, once each, and only so many", () => {
    let wall = [];
    for (const entry of ["p:cat", "f:0", "p:castle", "p:cat"]) wall = addToWall(wall, entry);
    expect(wall).toEqual(["p:cat", "p:castle", "f:0"]);
    for (let at = 0; at < 40; at += 1) wall = addToWall(wall, `f:${at % SLOTS}`);
    expect(wall.length).toBeLessThanOrEqual(WALL_MOST);
  });

  it("reads back only the pictures it knows how to show", async () => {
    const store = memory({ wall: JSON.stringify(["p:cat", "p:nothing", "f:3", "f:99", "s:1", 7, "x:1"]) });
    expect(await readWall(store)).toEqual(["p:cat", "f:3", "s:1"]);
    expect(await readWall(memory({ wall: "{}" }))).toEqual([]);
    await saveWall(store, ["f:1"]);
    expect(await readWall(store)).toEqual(["f:1"]);
  });

  it("opens a picture of each kind from the wall", async () => {
    const store = memory();
    await saveWork(store, "cat", fillZone(blankWork(), 0, "3"));
    await saveDrawing(store, "free/2", addItem(blankDrawing("dark"), { k: "s", t: 0, p: 1, x: 5, y: 5, m: 0 }));
    await saveShared(store, 4, { page: "castle", fills: { 1: "2" } });
    expect(await loadPicture(store, "p:cat")).toEqual({ entry: "p:cat", kind: "page", page: "cat", work: fillZone(blankWork(), 0, "3") });
    expect((await loadPicture(store, "f:2")).drawing.paper).toBe("dark");
    expect(await loadPicture(store, "s:4")).toEqual({ entry: "s:4", kind: "shared", page: "castle", work: { fills: { 1: "2" }, items: [] } });
    expect(await loadPicture(store, "s:5")).toBeNull();
  });
});

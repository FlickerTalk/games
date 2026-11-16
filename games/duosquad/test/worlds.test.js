import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { HULLS, ZONES } from "../src/levels.js";
import { THEME } from "../src/theme.js";
import { KINDS } from "../src/waves.js";
import { WORLD_ART } from "../src/worlds.js";

const NAMES = ["cockpitOf", "drawBolt", "drawBoss", "drawCaught", "drawCraft", "drawEnemy", "drawFreed", "drawHazard", "drawLink", "drawOrb", "drawPop", "drawScenery"];
const outline = (paint) => shapes(draw(paint)).join("|");
const leaves = (value) => (value && typeof value === "object" ? Object.values(value).flatMap(leaves) : [value]);

function box(paint, name) {
  const ctx = draw(paint);
  expect(ctx.depth, name).toBe(0);
  expect(ctx.calls.length, name).toBeGreaterThan(3);
  return bounds(painted(ctx));
}

const reach = (area, [x, y]) => Math.max(x - area.left, area.right - x, y - area.top, area.bottom - y);

describe.each(Object.keys(WORLD_ART))("the art of the %s world", (world) => {
  const art = WORLD_ART[world];
  const look = THEME.art.worlds[world];
  const known = new Set(leaves(look));

  it("offers every drawing the play screen asks a world for", () => {
    expect(Object.keys(art).sort()).toEqual(NAMES);
    expect(Object.isFrozen(art)).toBe(true);
  });

  it("draws eight crafts, each with its own outline, about as large as asked, the pilot's seat near the middle", () => {
    const outlines = new Set();
    HULLS[world].forEach((_, hull) => {
      const area = box((pen) => art.drawCraft(pen, 200, 200, 80, hull, look, { seat: 0, time: 0 }), `hull ${hull}`);
      expect(reach(area, [200, 200]), `hull ${hull}`).toBeLessThanOrEqual(80 * 0.85);
      expect(area.right - area.left, `hull ${hull}`).toBeGreaterThanOrEqual(80 * 0.45);
      outlines.add(outline((pen) => art.drawCraft(pen, 0, 0, 80, hull, look, { seat: 0, time: 0 })));
      const [dx, dy] = art.cockpitOf(hull);
      expect(Math.abs(dx)).toBeLessThanOrEqual(0.25);
      expect(Math.abs(dy)).toBeLessThanOrEqual(0.25);
    });
    expect(outlines.size).toBe(8);
  });

  it("tells the two players' crafts apart, leans a craft that turns and shows one that is caught", () => {
    const craft = (options) => draw((pen) => art.drawCraft(pen, 0, 0, 80, 0, look, { seat: 0, time: 0, ...options }));
    expect(colours(craft({ seat: 1 }))).not.toEqual(colours(craft({})));
    expect(shapes(craft({ bank: 1 }))).not.toEqual(shapes(craft({})));
    expect(colours(craft({ caught: true }))).not.toEqual(colours(craft({})));
  });

  it("draws every kind of enemy with its own outline, within its size, and a core for each player", () => {
    const kinds = Object.keys(KINDS);
    for (const kind of kinds) {
      const area = box((pen) => art.drawEnemy(pen, 300, 300, 70, kind, look, { time: 0, owner: 0, variant: 0 }), kind);
      expect(reach(area, [300, 300]), kind).toBeLessThanOrEqual(70 * 0.95);
    }
    expect(new Set(kinds.map((kind) => outline((pen) => art.drawEnemy(pen, 0, 0, 70, kind, look, { time: 0, owner: 0, variant: 0 })))).size).toBe(kinds.length);
    const core = (owner) => draw((pen) => art.drawEnemy(pen, 0, 0, 70, "core", look, { time: 0, owner }));
    expect(shapes(core(0))).not.toEqual(shapes(core(1)));
    const fresh = outline((pen) => art.drawEnemy(pen, 0, 0, 70, "elite", look, { time: 0 }));
    expect(outline((pen) => art.drawEnemy(pen, 0, 0, 70, "elite", look, { time: 0, hit: 0.5 }))).not.toBe(fresh);
  });

  it("breaks a popped enemy into harmless pieces that spread and fade", () => {
    const pop = (progress) => draw((pen) => art.drawPop(pen, 300, 300, 70, "scout", progress, look, 0));
    const [early, late] = [bounds(painted(pop(0.2))), bounds(painted(pop(0.9)))];
    expect(late.right - late.left).toBeGreaterThan(early.right - early.left);
    const faintest = (ctx) => Math.min(...ctx.calls.filter((call) => call.op === "set" && call.name === "globalAlpha").map((call) => call.value));
    expect(faintest(pop(0.9))).toBeLessThan(faintest(pop(0.2)));
    expect(pop(0.5).depth).toBe(0);
  });

  it("draws the big one of a boss round around its two cores, and shows each side opened", () => {
    const boss = (open) => outline((pen) => art.drawBoss(pen, 300, 200, 60, look, { time: 0, open }));
    const area = box((pen) => art.drawBoss(pen, 300, 200, 60, look, { time: 0, open: [false, false] }), "boss");
    expect(area.right - area.left).toBeGreaterThanOrEqual(150);
    expect(new Set([boss([false, false]), boss([true, false]), boss([false, true]), boss([true, true])]).size).toBe(4);
  });

  it("draws the bolts, what the enemies throw, the caught and the freed marks, the link and the orb", () => {
    box((pen) => art.drawBolt(pen, 100, 100, 24, look, { seat: 0, wide: false, time: 0 }), "bolt");
    const bolt = (options) => draw((pen) => art.drawBolt(pen, 100, 100, 24, look, { seat: 0, wide: false, time: 0, ...options }));
    expect(shapes(bolt({ wide: true }))).not.toEqual(shapes(bolt({})));
    expect(colours(bolt({ seat: 1 }))).not.toEqual(colours(bolt({})));
    const hazard = box((pen) => art.drawHazard(pen, 100, 100, 40, look, 0), "hazard");
    expect(hazard.right - hazard.left).toBeGreaterThanOrEqual(30);
    box((pen) => art.drawCaught(pen, 100, 100, 80, look, 0), "caught");
    box((pen) => art.drawFreed(pen, 100, 100, 80, 0.4, look), "freed");
    box((pen) => art.drawLink(pen, { x: 60, y: 100 }, { x: 160, y: 100 }, look, 0), "link");
    box((pen) => art.drawOrb(pen, 100, 100, 24, look, 0), "orb");
  });

  it("draws its three places inside the area it is given, starting from that place's ground colour", () => {
    const outlines = new Set();
    for (const zone of ZONES[world]) {
      const ctx = draw((pen) => art.drawScenery(pen, { x: 10, y: 20, w: 360, h: 640 }, zone, look, 3));
      expect(ctx.depth, zone).toBe(0);
      expect(ctx.calls.some((call) => call.op === "clip"), zone).toBe(true);
      expect(colours(ctx)[0], zone).toBe(look.zones[zone].sky);
      outlines.add(shapes(ctx).join("|"));
    }
    expect(outlines.size).toBe(3);
  });

  it("takes every colour from the theme, and draws the same thing at the same time", () => {
    const everything = (time) =>
      draw((pen) => {
        art.drawScenery(pen, { x: 0, y: 0, w: 360, h: 640 }, ZONES[world][1], look, time);
        HULLS[world].forEach((_, hull) => art.drawCraft(pen, 100, 500, 72, hull, look, { seat: hull % 2, time, bank: 0.5, caught: hull === 3 }));
        Object.keys(KINDS).forEach((kind, at) => art.drawEnemy(pen, 50 + at * 40, 200, 60, kind, look, { time, hit: 0.3, left: 0.5, owner: at % 2, variant: at }));
        Object.keys(KINDS).forEach((kind) => art.drawPop(pen, 100, 100, 60, kind, 0.4, look, time));
        art.drawBoss(pen, 180, 150, 60, look, { time, open: [true, false] });
        art.drawBolt(pen, 100, 300, 24, look, { seat: 1, wide: true, time });
        art.drawHazard(pen, 100, 300, 40, look, time);
        art.drawCaught(pen, 100, 500, 72, look, time);
        art.drawFreed(pen, 100, 500, 72, 0.5, look);
        art.drawLink(pen, { x: 100, y: 500 }, { x: 200, y: 500 }, look, time);
        art.drawOrb(pen, 50, 50, 24, look, time);
      });
    const ctx = everything(2.5);
    expect(ctx.depth).toBe(0);
    for (const colour of colours(ctx)) expect(known.has(colour), colour).toBe(true);
    expect(shapes(everything(2.5))).toEqual(shapes(ctx));
  });
});

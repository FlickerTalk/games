import { describe, expect, it } from "vitest";
import { HAIRS } from "../../src/avatars/cast.js";
import { drawBadge, drawRoundEnd } from "../../src/avatars/badge.js";
import { drawAvatar } from "../../src/avatars/face.js";
import { bounds, colours, contains, draw, painted, shapes } from "./recorder.js";

const badge = (options, size = 44, x = 100, y = 100) => draw((ctx) => drawBadge(ctx, x, y, size, options));
const roundEnd = (options, size = 120, x = 300, y = 200) => draw((ctx) => drawRoundEnd(ctx, x, y, size, options));
const avatar = (x, y, size, options) => shapes(draw((ctx) => drawAvatar(ctx, x, y, size, options)));

const GOLD = "#FFC846";

describe("the portrait badge", () => {
  it("holds the player's avatar, in the face it is given", () => {
    const options = { who: "zuri", hair: "bob", hairColour: "golden", face: "happy", time: 0.4 };
    expect(contains(shapes(badge(options)), avatar(100, 100 + 44 * 0.04, 44 * 0.78, options))).toBe(true);
  });

  it("thinks while it waits: the thinking face and three dots that move with time", () => {
    const options = { who: "flick", face: "happy", time: 0.4 };
    expect(shapes(badge({ ...options, thinking: true }))).toEqual(shapes(badge({ ...options, face: "thinking", thinking: true })));
    const plain = shapes(badge({ ...options, face: "thinking" }));
    const thinking = shapes(badge({ ...options, thinking: true }));
    expect(thinking.length).toBeGreaterThan(plain.length);
    expect(thinking.filter((call) => call.startsWith('["arc"')).length - plain.filter((call) => call.startsWith('["arc"')).length).toBe(3);
    const dots = (time) => badge({ who: "milo", thinking: true, time }).calls.filter((call) => call.op === "arc").slice(-3).map((call) => call.points[0][1]);
    expect(dots(0.1)).not.toEqual(dots(0.4));
  });

  it("stays in its box with any hair, and Flick's antenna", () => {
    for (const size of [32, 44, 64]) {
      for (const who of ["kit", "flick"]) {
        for (const hair of HAIRS) {
          const box = bounds(painted(badge({ who, hair: hair.id, thinking: true, time: 0.3 }, size, 200, 200)));
          expect(Math.max(200 - box.left, box.right - 200, 200 - box.top, box.bottom - 200), `${who} ${hair.id} ${size}`).toBeLessThanOrEqual(size / 2);
        }
      }
    }
  });

  it("never throws and leaves the context as it found it", () => {
    for (const options of [undefined, null, { who: 4, thinking: "yes", time: Number.NaN }]) {
      const ctx = badge(options);
      expect(ctx.depth).toBe(0);
      expect(ctx.matrix).toEqual([1, 0, 0, 1, 0, 0]);
    }
    expect(badge({}, 0).calls).toEqual([]);
  });
});

describe("the end of a round", () => {
  const winner = { who: "ari", hair: "wavy-headband", hairColour: "chestnut" };
  const other = { who: "flick" };

  it("shows the winner cheering and the other with an oops, facing each other", () => {
    const drawn = shapes(roundEnd({ winner, other, time: 0.5 }));
    expect(contains(drawn, avatar(300 - 60, 200 + 120 * 0.12, 120 * 0.6, { ...winner, face: "cheering", time: 0.5, motion: 1 }))).toBe(true);
    expect(contains(drawn, avatar(300 + 60, 200 + 120 * 0.14, 120 * 0.54, { ...other, face: "oops", time: 0.8, flip: true }))).toBe(true);
  });

  it("gives the winner one to three stars", () => {
    const gold = (stars) => colours(roundEnd({ winner, other, stars })).filter((one) => one === GOLD).length;
    expect([1, 2, 3].map(gold)).toEqual([1, 2, 3]);
    expect(gold(0)).toBe(1);
    expect(gold(9)).toBe(3);
    expect(gold("many")).toBe(3);
  });

  it("stays in a box twice as wide as it is tall", () => {
    for (const hair of HAIRS) {
      const box = bounds(painted(roundEnd({ winner: { ...winner, hair: hair.id }, other: { who: "sam", hair: hair.id }, time: 0.3 })));
      expect(box.left, hair.id).toBeGreaterThanOrEqual(300 - 120);
      expect(box.right, hair.id).toBeLessThanOrEqual(300 + 120);
      expect(box.top, hair.id).toBeGreaterThanOrEqual(200 - 60);
      expect(box.bottom, hair.id).toBeLessThanOrEqual(200 + 60);
    }
  });

  it("never throws on what it does not know", () => {
    for (const options of [undefined, null, { winner: 3, other: "x", stars: null }]) {
      const ctx = roundEnd(options);
      expect(ctx.depth).toBe(0);
    }
  });
});

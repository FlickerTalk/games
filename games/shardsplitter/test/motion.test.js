import { describe, expect, it } from "vitest";
import { piecePlaces } from "../src/layout.js";
import { ENTER_MS, FLYING_MOST, IMPACT_MS, LEAVE_MS, SPLIT_MS, SWING_MS, malletAt, sceneAt } from "../src/motion.js";

const FIELD = { x: 100, y: 100, w: 300, h: 200 };
const JAR = { x: 30, y: 30, size: 40 };
const view = (extra = {}) => ({ stand: { value: 12, count: 1, cap: null }, split: null, leave: null, enter: null, tongueUntil: 0, ...extra });

describe("what stands on the stage at a moment", () => {
  it("is the golems in their places, waiting", () => {
    const scene = sceneAt(view({ stand: { value: 6, count: 2, cap: 4 } }), FIELD, JAR, 5000);
    expect(scene.flying).toEqual([]);
    expect(scene.pieces).toHaveLength(2);
    expect(scene.pieces.map(({ x, y, size }) => ({ x, y, size }))).toEqual(piecePlaces(FIELD, 2));
    expect(scene.pieces[0]).toMatchObject({ value: 6, cap: 4, mood: "waiting" });
  });

  it("is still the whole golem until the mallet lands, then its pieces moving apart to their own places", () => {
    const split = { start: 1000 + IMPACT_MS, from: { value: 12, count: 1 }, to: { value: 4, count: 3 } };
    const round = view({ stand: { value: 4, count: 3, cap: null }, split });
    const before = sceneAt(round, FIELD, JAR, 1000);
    expect(before.pieces).toHaveLength(1);
    expect(before.pieces[0].value).toBe(12);
    const during = sceneAt(round, FIELD, JAR, split.start + 1);
    const whole = piecePlaces(FIELD, 1)[0];
    expect(during.pieces).toHaveLength(3);
    for (const piece of during.pieces) {
      expect(piece).toMatchObject({ value: 4, mood: "giggle" });
      expect(Math.abs(piece.x - whole.x)).toBeLessThan(3);
    }
    const after = sceneAt(round, FIELD, JAR, split.start + SPLIT_MS + 1);
    expect(after.pieces.map(({ x, y }) => ({ x, y }))).toEqual(piecePlaces(FIELD, 3).map(({ x, y }) => ({ x, y })));
  });

  it("puts out their tongues after a clink, for a moment", () => {
    const round = view({ tongueUntil: 2000 });
    expect(sceneAt(round, FIELD, JAR, 1500).pieces[0].mood).toBe("tongue");
    expect(sceneAt(round, FIELD, JAR, 2500).pieces[0].mood).toBe("waiting");
  });

  it("sends the finished golems hopping into the jar, ones as plain crystals and never more than twelve drawn", () => {
    const leave = { start: 3000, value: 7, count: 6, parents: 6, ones: false };
    const round = view({ stand: { value: 7, count: 6, cap: null }, leave });
    expect(sceneAt(round, FIELD, JAR, 2999).pieces).toHaveLength(6);
    const early = sceneAt(round, FIELD, JAR, 3001);
    expect(early.pieces).toEqual([]);
    expect(early.flying).toHaveLength(6);
    expect(early.flying[0]).toMatchObject({ value: 7, shard: false });
    const late = sceneAt(round, FIELD, JAR, 3000 + LEAVE_MS - 1);
    for (const piece of late.flying) expect(Math.hypot(piece.x - JAR.x, piece.y - JAR.y)).toBeLessThan(12);
    expect(late.flying[0].size).toBeLessThan(early.flying[0].size);
    const ones = sceneAt(view({ leave: { start: 3000, value: 1, count: 20, parents: 4, ones: true } }), FIELD, JAR, 3100);
    expect(ones.flying).toHaveLength(FLYING_MOST);
    expect(ones.flying[0]).toMatchObject({ value: 1, shard: true });
  });

  it("rolls the next golem in from the right", () => {
    const round = view({ enter: { start: 4000 } });
    const place = piecePlaces(FIELD, 1)[0];
    const first = sceneAt(round, FIELD, JAR, 4001).pieces[0];
    expect(first.mood).toBe("rolling");
    expect(first.x).toBeGreaterThan(place.x + 100);
    expect(sceneAt(round, FIELD, JAR, 4000 + ENTER_MS + 1).pieces[0]).toMatchObject({ x: place.x, mood: "waiting" });
  });

  it("shows nothing standing once the round is over", () => {
    expect(sceneAt(view({ stand: null }), FIELD, JAR, 100)).toEqual({ pieces: [], flying: [] });
  });
});

describe("the mallet", () => {
  it("rests on the shoulder, winds up, comes down on the golem and goes back", () => {
    const rest = malletAt(null, 0);
    expect(malletAt({ start: 1000, miss: false }, 1000 + SWING_MS + 1)).toEqual(rest);
    const wound = malletAt({ start: 1000, miss: false }, 1000 + IMPACT_MS * 0.5);
    const down = malletAt({ start: 1000, miss: false }, 1000 + IMPACT_MS);
    expect(wound.angle).toBeLessThan(rest.angle);
    expect(down.angle).toBeGreaterThan(rest.angle + 1);
    expect(down.pose).toBe("idle");
  });

  it("bounces back off a golem it cannot split, the hero taken aback", () => {
    const back = malletAt({ start: 1000, miss: true }, 1000 + IMPACT_MS + 80);
    expect(back.pose).toBe("lose");
    expect(back.angle).toBeLessThan(malletAt({ start: 1000, miss: false }, 1000 + IMPACT_MS + 80).angle);
  });
});

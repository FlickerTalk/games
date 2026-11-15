import { describe, expect, it } from "vitest";
import { EXPRESSIONS, HAIRS, HAIR_COLOURS, PROFILES } from "../../src/avatars/cast.js";
import { drawAvatar } from "../../src/avatars/face.js";
import { bounds, colours, draw, painted, shapes } from "./recorder.js";

const SIZES = [32, 44, 64, 120, 240];

const avatar = (options, size = 100, x = 0, y = 0) => draw((ctx) => drawAvatar(ctx, x, y, size, options));

function shifted(ctx) {
  const first = ctx.calls.find((call) => call.op === "moveTo");
  return shapes(ctx, { shift: first.points[0] });
}

function own(ctx, other) {
  const start = ctx.calls.find((call) => call.op === "moveTo").points[0];
  const theirs = new Set(shifted(other));
  return ctx.calls.filter((call) => call.points.length && !theirs.has(shapes({ calls: [call] }, { shift: start })[0]));
}

const reach = (call, [x, y]) => (call.radius ? Math.hypot(call.points[0][0] - x, call.points[0][1] - y) + call.radius : Math.max(...call.points.map(([px, py]) => Math.hypot(px - x, py - y))));

describe("an avatar", () => {
  it("draws the same calls for the same options and time, and moves with time", () => {
    const options = { who: "milo", hair: "ponytail", hairColour: "copper", face: "happy", time: 1.3 };
    expect(shapes(avatar(options))).toEqual(shapes(avatar(options)));
    expect(colours(avatar(options))).toEqual(colours(avatar(options)));
    expect(shapes(avatar({ ...options, time: 1.9 }))).not.toEqual(shapes(avatar(options)));
  });

  it("blinks now and then, and is open-eyed the rest of the time", () => {
    const frames = Array.from({ length: 100 }, (_, step) => step * 0.05);
    const eyes = (time) => avatar({ who: "milo", face: "neutral", time }).calls.filter((call) => call.op === "arc" && call.radius < 4);
    const heights = frames.map((time) => Math.min(...eyes(time).map((call) => call.points[2][1] - call.points[1][1])));
    const open = Math.max(...heights);
    expect(eyes(0)).toHaveLength(2);
    expect(Math.min(...heights)).toBeLessThan(open / 2);
    expect(heights.filter((height) => height > open * 0.99).length).toBeGreaterThan(frames.length * 0.9);
  });

  it("can be told apart without colour, by an emblem drawn at a readable size, at every size from 32 px", () => {
    for (const size of SIZES) {
      const drawn = PROFILES.map((profile) => avatar({ who: profile.id, hair: "none", face: "neutral" }, size, 200, 200));
      drawn.forEach((ctx, one) => {
        for (let two = 0; two < drawn.length; two += 1) {
          if (one !== two) expect(own(ctx, drawn[two]).length, `${PROFILES[one].id} and ${PROFILES[two].id} at ${size} px`).toBeGreaterThan(0);
        }
        const mark = bounds(own(ctx, drawn[(one + 1) % drawn.length]).flatMap((call) => call.points));
        expect(Math.max(mark.right - mark.left, mark.bottom - mark.top), `${PROFILES[one].id} at ${size} px`).toBeGreaterThanOrEqual(Math.max(size * 0.12, 5));
      });
    }
  });

  it("keeps its emblem on the face", () => {
    for (const size of SIZES) {
      const drawn = PROFILES.map((profile) => avatar({ who: profile.id, hair: "none", face: "neutral" }, size, 200, 200));
      drawn.forEach((ctx, one) => {
        const start = ctx.calls.find((call) => call.op === "moveTo").points[0];
        const centre = [start[0], start[1] + 0.42 * size];
        for (const call of own(ctx, drawn[(one + 1) % drawn.length])) {
          expect(reach(call, centre), `${PROFILES[one].id} at ${size} px`).toBeLessThanOrEqual(size * 0.46);
        }
      });
    }
  });

  it("wears any hairstyle in any colour on any profile, each hairstyle its own shape", () => {
    for (const profile of PROFILES) {
      const looks = new Set();
      for (const hair of HAIRS) {
        for (const colour of HAIR_COLOURS) {
          const used = colours(avatar({ who: profile.id, hair: hair.id, hairColour: colour.id }));
          if (hair.id !== "none") expect(used, `${profile.id} ${hair.id} ${colour.id}`).toContain(colour.colour);
        }
        looks.add(JSON.stringify(shapes(avatar({ who: profile.id, hair: hair.id }))));
      }
      expect(looks.size, profile.id).toBe(HAIRS.length);
    }
  });

  it("has twelve expressions, each its own shape, on a player and on Flick", () => {
    for (const who of ["juno", "flick"]) {
      const faces = new Set(EXPRESSIONS.map((face) => JSON.stringify(shapes(avatar({ who, hair: "bun", face })))));
      expect(faces.size, who).toBe(EXPRESSIONS.length);
    }
  });

  it("stays in its box, hair and antenna included, at every size", () => {
    for (const size of SIZES) {
      for (const who of [...PROFILES.map((one) => one.id), "flick"]) {
        for (const hair of HAIRS) {
          for (const time of [0, 0.4, 2.2]) {
            const box = bounds(painted(avatar({ who, hair: hair.id, face: "cheering", time }, size, 500, 500)));
            const room = size * 0.7;
            expect(box.left, `${who} ${hair.id} ${size}`).toBeGreaterThanOrEqual(500 - room);
            expect(box.right, `${who} ${hair.id} ${size}`).toBeLessThanOrEqual(500 + room);
            expect(box.top, `${who} ${hair.id} ${size}`).toBeGreaterThanOrEqual(500 - room);
            expect(box.bottom, `${who} ${hair.id} ${size}`).toBeLessThanOrEqual(500 + room);
          }
        }
      }
    }
  });

  it("draws Flick as the robot whatever hair it is given, and never as a player", () => {
    const flick = shapes(avatar({ who: "flick", hair: "none" }));
    expect(shapes(avatar({ who: "flick", hair: "quiff", hairColour: "golden" }))).toEqual(flick);
    for (const profile of PROFILES) expect(shapes(avatar({ who: profile.id, hair: "none" }))).not.toEqual(flick);
    expect(colours(avatar({ who: "flick" }))).toContain("#8D7DE8");
  });

  it("mirrors itself when flipped", () => {
    const plain = avatar({ who: "nico", hair: "side-part", face: "confident" }, 100, 50, 50);
    const flipped = avatar({ who: "nico", hair: "side-part", face: "confident", flip: true }, 100, 50, 50);
    const xs = (ctx) => painted(ctx).map(([x]) => x - 50);
    const mirrored = xs(plain);
    expect(xs(flipped)).toHaveLength(mirrored.length);
    xs(flipped).forEach((x, at) => expect(x).toBeCloseTo(-mirrored[at], 6));
    expect(painted(flipped).map(([, y]) => y)).toEqual(painted(plain).map(([, y]) => y));
  });

  it("never throws, drawing the defaults for anything it does not know", () => {
    const fallback = shapes(avatar({}));
    for (const options of [undefined, null, 3, "milo", { who: "nobody", hair: "afro", hairColour: "teal", face: "angry" }, { who: {}, hair: [], hairColour: null, face: 7, time: "soon" }, { time: Number.NaN }, { time: Infinity }]) {
      expect(() => avatar(options), JSON.stringify(options)).not.toThrow();
      expect(shapes(avatar(options)), JSON.stringify(options)).toEqual(fallback);
    }
    for (const size of [0, -10, Number.NaN, "big"]) expect(() => avatar({}, size)).not.toThrow();
  });

  it("leaves the context as it found it", () => {
    for (const who of ["kit", "flick"]) {
      const ctx = avatar({ who, hair: "cap", face: "laughing", time: 3 }, 64, 10, 20);
      expect(ctx.depth).toBe(0);
      expect(ctx.matrix).toEqual([1, 0, 0, 1, 0, 0]);
    }
  });
});

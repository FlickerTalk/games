import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { tokensFor } from "../../../kit/test/canvas/themes.js";
import { COCKPIT, POSES, drawAircraft } from "../src/aircraft.js";
import { COLOURS, HELICOPTERS, PLANES } from "../src/levels.js";
import { THEME, themeFor } from "../src/theme.js";

const ALL = [...PLANES, ...HELICOPTERS];
const shown = (options, type = "propeller", theme = THEME) => draw((ctx) => drawAircraft(ctx, type, 200, 300, 80, theme, options));
const ops = (ctx, op) => ctx.calls.filter((call) => call.op === op);
const alphas = (ctx) => ctx.calls.filter((call) => call.op === "set" && call.name === "globalAlpha").map((call) => call.value);

describe("an aircraft's drawing", () => {
  it("draws each of the ten aircraft in its own shape, in every pose, leaving the canvas as it found it", () => {
    const seen = new Set();
    for (const type of ALL) {
      for (const pose of POSES) {
        const ctx = shown({ pose, time: 1.3, heading: [0.6, -0.8] }, type);
        expect(ctx.depth, `${type} ${pose}`).toBe(0);
        expect(ctx.calls.length, `${type} ${pose}`).toBeGreaterThan(15);
      }
      seen.add(JSON.stringify(shown({}, type).calls.map((call) => call.op)));
    }
    expect(seen.size).toBe(ALL.length);
  });

  it("keeps every aircraft inside its box, whichever way it points", () => {
    for (const type of ALL) {
      for (const heading of [[0, -1], [1, 0], [0.6, 0.8]]) {
        const ctx = shown({ heading, balloons: 0 }, type);
        const { left, right, top, bottom } = bounds(painted(ctx));
        for (const edge of [200 - left, right - 200, 300 - top, bottom - 300]) expect(edge, `${type} ${heading}`).toBeLessThan(80 * 0.62);
      }
    }
  });

  it("is painted in the colour the player chose, the same shape in each", () => {
    for (const colour of COLOURS) expect(colours(shown({ colour })), colour).toContain(THEME.art.colours[colour].body);
    expect(shown({ colour: "mint" }).calls.length).toBe(shown({ colour: "coral" }).calls.length);
  });

  it("seats its pilot upright in the cockpit, however the aircraft is turned", () => {
    for (const type of ALL) {
      for (const heading of [[0, -1], [1, 0], [-0.6, 0.8]]) {
        const seats = [];
        shown({ heading, pilot: (ctx, x, y, size) => seats.push({ x, y, size, matrix: ctx.matrix }) }, type);
        expect(seats).toHaveLength(1);
        const [seat] = seats;
        expect(seat.size).toBeGreaterThanOrEqual(80 * 0.28);
        expect(seat.matrix).toEqual([1, 0, 0, 1, 0, 0]);
        expect(seat.x).toBeCloseTo(200 + heading[0] * COCKPIT[type] * (80 / 120), 6);
        expect(seat.y).toBeCloseTo(300 + heading[1] * COCKPIT[type] * (80 / 120), 6);
      }
    }
  });

  it("flies with as many balloons on its tail as it has left, round for one player and squared for the other", () => {
    const count = (options) => shown(options).calls.length;
    expect(count({ balloons: 3 })).toBeGreaterThan(count({ balloons: 2 }));
    expect(count({ balloons: 1 })).toBeGreaterThan(count({ balloons: 0 }));
    const round = shown({ balloons: 3 });
    const squared = shown({ balloons: 3, squared: true });
    expect(ops(round, "ellipse").length).toBeGreaterThan(ops(squared, "ellipse").length);
    expect(colours(squared)).toContain(THEME.art.balloons.squared[0]);
  });

  it("is half seen inside a cloud, hangs out a smiling parachute when its balloons are gone, and shows its hurry", () => {
    expect(alphas(shown({ hidden: true }))).toContain(0.5);
    expect(alphas(shown({}))).not.toContain(0.5);
    const losing = shown({ pose: "losing", balloons: 0 });
    expect(colours(losing)).toContain(THEME.art.effects.parachute);
    expect(shown({ pose: "speed" }).calls.length).toBeGreaterThan(shown({ pose: "idle" }).calls.length);
  });

  it("gets a light rim round its dark outline on a dark page", () => {
    const dark = themeFor(tokensFor("mono-dark"), { dark: true });
    expect(colours(shown({}, "jet", dark))).toContain(dark.ui.rim);
    expect(colours(shown({}, "jet", THEME))).not.toContain(dark.ui.rim);
  });
});

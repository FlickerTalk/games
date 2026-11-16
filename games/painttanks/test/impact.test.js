import { describe, expect, it, vi } from "vitest";
import { landed } from "../src/impact.js";

function gameWith(last, { mySide = 0 } = {}) {
  const round = { mySide, stains: [], paths: [null, null] };
  return { state: { round, moments: [] }, sound: { play: vi.fn() } };
}

const flight = (extra) => ({ path: [[0, 0], [10, 10]], end: { kind: "ground", x: 120, y: 330 }, entry: null, painted: [], struck: [], bounced: false, ...extra });
const shot = (extra, side = 0) => ({ last: { side, flight: flight(extra), rained: null, special: false } });
const kinds = (game) => game.state.moments.map((one) => one.kind);
const sounds = (game) => game.sound.play.mock.calls.map(([name]) => name);

describe("where a shot lands", () => {
  it("splashes and leaves a stain on the ground, and keeps its path drawn faintly", () => {
    const game = gameWith();
    landed(game, shot({}), 1000);
    expect(kinds(game)).toEqual(["splash"]);
    expect(game.state.round.stains).toEqual([expect.objectContaining({ water: false, x: 120, y: 330, team: 0 })]);
    expect(game.state.round.paths[0]).toHaveLength(2);
    expect(sounds(game)).toEqual(["place"]);
  });

  it("paints the vehicle it hits, which wipes it off, and sends a star to the shooter's score", () => {
    const game = gameWith();
    landed(game, shot({ end: { kind: "vehicle", side: 1, x: 300, y: 280 }, painted: [1] }), 1000);
    expect(kinds(game)).toEqual(expect.arrayContaining(["splash", "wipe", "star"]));
    expect(game.state.moments.find((one) => one.kind === "star").to).toBe("me");
    expect(sounds(game)).toContain("pop");
  });

  it("answers a thing it paints, and a star flies for it to whoever shot", () => {
    const game = gameWith({}, { mySide: 0 });
    landed(game, shot({ end: { kind: "target", target: 2, x: 200, y: 200 }, struck: [2] }, 1), 1000);
    expect(game.state.moments.find((one) => one.kind === "target").index).toBe(2);
    expect(game.state.round.hitBy).toEqual({ 2: 1 });
    expect(game.state.moments.find((one) => one.kind === "star").to).toBe("rival");
    expect(sounds(game)).toContain("collect");
  });

  it("makes a splash and a fading stain where it falls into the water", () => {
    const game = gameWith();
    landed(game, shot({ end: { kind: "spent", x: 220, y: 400 }, entry: { x: 210, y: 312 } }), 1000);
    expect(game.state.moments).toEqual([expect.objectContaining({ kind: "splash", water: true, x: 210, y: 312 })]);
    expect(game.state.round.stains).toEqual([expect.objectContaining({ water: true, at: 1000 })]);
    expect(sounds(game)).toEqual(["splash"]);
  });
});

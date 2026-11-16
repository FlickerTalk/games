import { describe, expect, it } from "vitest";
import { draw } from "../canvas/recorder.js";
import { decodePath, tracePath } from "../../src/cards/path.js";

describe("a path written in the deck's compact text", () => {
  it("reads back as moves, lines, curves and closes in absolute units", () => {
    expect(decodePath("")).toEqual([]);
    expect(decodePath("AUUD")).toEqual([0, 10, 10, 3]);
    expect(decodePath("AoGAD")).toEqual([0, 100, 0, 3]);
    expect(decodePath("AUUBHI")).toEqual([0, 10, 10, 1, 6, 14]);
  });

  it("writes a run of the same step once, followed by the points of each", () => {
    expect(decodePath("AUUFCCCC")).toEqual([0, 10, 10, 1, 11, 11, 1, 12, 12]);
    const eighteen = decodePath(`AAAlC${"C".repeat(36)}`);
    expect(eighteen).toHaveLength(3 + 3 * 18);
    expect(eighteen.slice(-3)).toEqual([1, 18, 18]);
  });

  it("is traced on a canvas once per call, in its own units, without filling or stroking", () => {
    const ops = [0, 10, 10, 2, 20, 10, 30, 20, 30, 30, 1, 35, 33, 3];
    const ctx = draw((pen) => tracePath(pen, ops));
    expect(ctx.calls.map((call) => call.op)).toEqual(["moveTo", "bezierCurveTo", "lineTo", "closePath"]);
    expect(ctx.calls[1].points).toEqual([[20, 10], [30, 20], [30, 30]]);
  });

  it("gives back the same list for the same text, so a court is decoded only once", () => {
    expect(decodePath("AUUD")).toBe(decodePath("AUUD"));
  });
});

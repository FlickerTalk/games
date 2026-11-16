import { describe, expect, it } from "vitest";
import { defaultPlayer } from "../../../kit/src/avatars/index.js";
import { bounds, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { tokensFor } from "../../../kit/test/canvas/themes.js";
import { drawPiece, drawSnail, drawTurnMarker, faceFor } from "../src/pieces.js";
import { themeFor } from "../src/theme.js";

const THEME = themeFor(tokensFor("mono-light"));
const ME = defaultPlayer();
const FLICK = { who: "flick" };

describe("a piece", () => {
  it("is the player's round face on a plate, round for one side and square for the other", () => {
    const mine = draw((pen) => drawPiece(pen, 100, 100, 60, 0, ME, THEME, {}));
    const theirs = draw((pen) => drawPiece(pen, 100, 100, 60, 1, ME, THEME, {}));
    expect(mine.calls.some((call) => call.op === "fillText")).toBe(false);
    expect(mine.calls.filter((call) => call.op === "arcTo").length).toBeLessThan(theirs.calls.filter((call) => call.op === "arcTo").length);
    expect(shapes(mine)).not.toEqual(shapes(theirs));
  });

  it("stays within its size around its square, with Flick too", () => {
    for (const player of [ME, FLICK]) {
      const box = bounds(painted(draw((pen) => drawPiece(pen, 100, 100, 60, 1, player, THEME, { time: 1 }))));
      expect(box.left).toBeGreaterThanOrEqual(100 - 42);
      expect(box.right).toBeLessThanOrEqual(100 + 42);
      expect(box.top).toBeGreaterThanOrEqual(100 - 48);
      expect(box.bottom).toBeLessThanOrEqual(100 + 42);
    }
  });

  it("rises when it hops and leaves its shadow on the square", () => {
    const rest = bounds(painted(draw((pen) => drawPiece(pen, 100, 100, 60, 0, ME, THEME, {}))));
    const up = bounds(painted(draw((pen) => drawPiece(pen, 100, 100, 60, 0, ME, THEME, { lift: 1 }))));
    expect(up.top).toBeLessThan(rest.top - 10);
    expect(up.bottom).toBeCloseTo(rest.bottom, 0);
  });

  it("shows on its face what happened to it", () => {
    expect(faceFor("idle", false)).toBe("neutral");
    expect(faceFor("idle", true)).toBe("confident");
    expect(faceFor("hop", true)).toBe("happy");
    expect(faceFor("bumped", false)).toBe("surprised");
    expect(faceFor("laugh", true)).toBe("laughing");
    expect(faceFor("wet", false)).toBe("oops");
    expect(faceFor("cheer", false)).toBe("cheering");
  });
});

describe("the marks around the pieces", () => {
  it("draw a turn pointer in each side's shape, and a snail for a turn sat out, without a word", () => {
    const round = draw((pen) => drawTurnMarker(pen, 50, 50, 28, 0, THEME, 0));
    const square = draw((pen) => drawTurnMarker(pen, 50, 50, 28, 1, THEME, 0));
    expect(shapes(round)).not.toEqual(shapes(square));
    const snail = draw((pen) => drawSnail(pen, 50, 50, 40, THEME, 0.4));
    expect(snail.calls.length).toBeGreaterThan(10);
    for (const ctx of [round, square, snail]) {
      expect(ctx.depth).toBe(0);
      expect(ctx.calls.some((call) => call.op === "fillText")).toBe(false);
    }
  });
});

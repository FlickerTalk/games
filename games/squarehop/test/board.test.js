import { describe, expect, it } from "vitest";
import { bounds, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { barShown, drawPlay, pointAt } from "../src/board.js";
import { mayPick } from "../src/flow.js";
import { squareAt } from "../src/layout.js";
import { FINISH } from "../src/rules.js";
import { DARK, FRAMES, LIGHT, gameAt, paint, texts } from "./screens.js";

const DIGITS = /^[0-9]+$/;
const play = (made, theme = LIGHT, open) => paint((ctx) => drawPlay(ctx, made.game.state, theme, made.now() / 1000, { open: open ?? mayPick(made.game, made.now()) }));

describe("the play screen", () => {
  it("writes digits only: the thirty squares and where each piece stands", async () => {
    for (const [width, height, fill] of FRAMES) {
      const made = await gameAt("play", { width, height, fill });
      const written = texts(play(made));
      expect(written.every((text) => DIGITS.test(text)), `${width}x${height}`).toBe(true);
      expect(written.slice(0, FINISH)).toEqual(Array.from({ length: FINISH }, (_, at) => String(at + 1)));
    }
  });

  it("draws inside the frame in every size and both themes, leaving the context as it found it", async () => {
    for (const [width, height, fill] of FRAMES) {
      const made = await gameAt("hopping", { width, height, fill });
      for (const theme of [LIGHT, DARK]) {
        const ctx = play(made, theme);
        const box = bounds(painted(ctx).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y)));
        expect(box.left, `${width}x${height}`).toBeGreaterThanOrEqual(-120);
        expect(box.right, `${width}x${height}`).toBeLessThanOrEqual(width + 120);
        expect(ctx.depth).toBe(0);
      }
    }
  });

  it("puts a piece between two squares while it hops, and on its square at rest", () => {
    const track = { count: 30, cols: 6, rows: 5, cell: 50, gap: 7, rowGap: 25, x: 10, y: 100, w: 335, h: 350 };
    expect(pointAt(track, 4)).toEqual({ x: squareAt(track, 4).x, y: squareAt(track, 4).y });
    const between = pointAt(track, 4.5);
    expect(between.x).toBeCloseTo((squareAt(track, 4).x + squareAt(track, 5).x) / 2, 5);
    expect(pointAt(track, 30).x).toBe(squareAt(track, 30).x);
  });

  it("shows whose turn it is, the hand over the dice until the first choice, and a different picture while a piece hops", async () => {
    const made = await gameAt("play");
    const resting = shapes(play(made));
    expect(made.game.state.hint).toBe(true);
    expect(shapes(play(made, LIGHT, false)).length).toBeLessThan(resting.length);
    const shown = barShown(made.game.state, made.now());
    expect(shown.turn).toBe(0);
    expect(shown.me.square).toBe(1);
    expect(shown.other.player).toEqual({ who: "flick" });
    const hopping = await gameAt("hopping");
    expect(shapes(play(hopping)).join("\n")).not.toBe(resting.join("\n"));
    expect(barShown(hopping.game.state, hopping.now()).me.square).toBeGreaterThanOrEqual(1);
  });

  it("draws the pause card over the round", async () => {
    const made = await gameAt("play");
    const before = shapes(play(made)).length;
    made.game.press({ kind: "pause", value: "pause" });
    expect(shapes(play(made)).length).not.toBe(before);
  });
});

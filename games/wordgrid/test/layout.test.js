import { describe, expect, it } from "vitest";
import { ROWS, ROWS_STYLE, SMALL, layoutFor, rowsFor } from "../src/layout.js";

const SIZES = [120, 214, 260, 261, 300, 343, 360, 480, 720];
const PHASES = ["shuffle", "play", "done"];
const between = (value, low, high) => value >= low - 1e-6 && value <= high + 1e-6;

describe("the Letter Grid square", () => {
  it("keeps the score row on top and the word row and the lists at the bottom, the board between them at every size", () => {
    for (const size of SIZES) {
      for (const phase of PHASES) {
        const { rows, area, frame, grid } = layoutFor(size, phase);
        const label = `${size} ${phase}`;
        const bottom = rows.word + rows.lists + (rows.word && rows.lists ? rows.gap : 0);
        expect(area.y, label).toBeCloseTo(rows.scores + rows.gap, 6);
        expect(area.y + area.h, label).toBeCloseTo(size - bottom - (bottom ? rows.gap : 0), 6);
        expect(between(frame.outer.x, 0, size) && between(frame.outer.x + frame.outer.w, 0, size), label).toBe(true);
        expect(between(frame.outer.y, area.y, area.y + area.h) && between(frame.outer.y + frame.outer.h + frame.depth, area.y, area.y + area.h), label).toBe(true);
        expect(grid.w, label).toBeCloseTo(grid.h, 6);
        expect(between(grid.x, frame.inner.x, frame.inner.x + frame.inner.w) && between(grid.y + grid.h, frame.inner.y, frame.inner.y + frame.inner.h), label).toBe(true);
        expect((frame.outer.x + frame.outer.w / 2) * 2, label).toBeCloseTo(size, 6);
      }
    }
  });

  it("does not move the board between the draw, the play and the end on a board that holds every row", () => {
    for (const size of SIZES.filter((one) => one > SMALL)) {
      const [shuffle, play, done] = PHASES.map((phase) => layoutFor(size, phase));
      expect(shuffle.grid, `${size}`).toEqual(play.grid);
      expect(done.grid, `${size}`).toEqual(play.grid);
    }
  });

  it("gives a small board's room to what the moment needs: the board while drawing, the word row in play, the lists at the end", () => {
    const [shuffle, play, done] = PHASES.map((phase) => rowsFor(SMALL, phase));
    expect([shuffle.word, shuffle.lists]).toEqual([0, 0]);
    expect(play.word).toBeGreaterThan(0);
    expect(play.lists).toBe(0);
    expect(done.word).toBe(0);
    expect(done.lists).toBe(SMALL / 2);
  });

  it("leaves tiles a finger can hit on the smallest board the room gives a phone", () => {
    expect(layoutFor(300, "play").grid.cell).toBeGreaterThanOrEqual(40);
    expect(layoutFor(343, "play").grid.cell).toBeGreaterThanOrEqual(46);
  });

  it("sizes the rows in the page's style with the same numbers the canvas is laid out with", () => {
    for (const [name, [least, share, most]] of Object.entries(ROWS)) {
      expect(ROWS_STYLE, name).toContain(`clamp(${least}px, ${share}cqh, ${most}px)`);
      expect(rowsFor(1000, "play")[name], name).toBe(most);
      expect(rowsFor(10, "play")[name] || least, name).toBe(least);
    }
    expect(ROWS_STYLE).toContain(`@container (max-height: ${SMALL}px)`);
  });
});

import { describe, expect, it } from "vitest";
import { ROOM_CHROME } from "../kit/src/stage.js";
import { RUNS, outside, roomHolds, sharp } from "./board-walk.js";

describe("the walk of a board game drawn on a canvas", () => {
  it("visits every size in the room and full screen, light and dark, and one of the app's colour directions", () => {
    const seen = RUNS.map(({ device, fill, theme }) => `${device.name} ${fill ? "fill" : "room"} ${theme}`);
    for (const size of ["360x640", "384x853", "430x932", "1280x800"]) {
      for (const where of ["room", "fill"]) {
        for (const theme of ["mono-light", "mono-dark"]) expect(seen, `${size} ${where} ${theme}`).toContain(`${size} ${where} ${theme}`);
      }
    }
    expect(seen).toContain("384x853 room ember-dark");
    expect(seen).toContain("384x853 fill ember-dark");
    expect(new Set(seen).size).toBe(seen.length);
  });

  it("knows when a phone's room is too short for the bar, the band and the game's smallest board", () => {
    expect(roomHolds({ height: 853 }, 320)).toBe(true);
    expect(roomHolds({ height: 640 }, 320)).toBe(false);
    expect(roomHolds({ height: ROOM_CHROME + 120 + 200 }, 200)).toBe(true);
  });

  it("finds the boxes that leave an area", () => {
    const area = { x: 0, y: 0, width: 100, height: 100 };
    expect(outside(area, [{ x: 10, y: 10, width: 20, height: 20 }, { x: 90, y: 90, width: 20, height: 5 }])).toEqual([{ x: 90, y: 90, width: 20, height: 5 }]);
    expect(outside(area, [{ x: -0.5, y: 0, width: 100.5, height: 100 }])).toEqual([]);
  });

  it("calls a canvas sharp when it has a pixel of its own for every pixel of the screen", () => {
    expect(sharp({ canvas: [704, 704], host: { width: 352, height: 352 }, ratio: 2 })).toBe(true);
    expect(sharp({ canvas: [352, 352], host: { width: 352, height: 352 }, ratio: 2 })).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { DEVICES, frameHeight, toneOf, toneShares } from "./canvas-walk.js";
import { ROOM_CHROME } from "../kit/src/stage.js";

describe("the walk of a canvas game", () => {
  it("visits the four sizes every canvas game is checked at", () => {
    expect(DEVICES.map(({ name }) => name)).toEqual(["360x640", "384x853", "430x932", "1280x800"]);
  });

  it("expects the frame the app gives: under its bar in full screen, the room's height in a conversation", () => {
    expect(frameHeight({ height: 853 }, true)).toBe(853 - 52);
    expect(frameHeight({ height: 853 }, false)).toBe(853 - ROOM_CHROME);
    expect(frameHeight({ height: 500 }, false)).toBe(300);
  });

  it("reads a pixel's lightness and chroma the way the eye sees them", () => {
    expect(toneOf([255, 255, 255])[0]).toBeCloseTo(1, 3);
    expect(toneOf([0, 0, 0])[0]).toBeCloseTo(0, 3);
    expect(toneOf([128, 128, 128])[1]).toBeLessThan(0.001);
    expect(toneOf([242, 107, 94])[1]).toBeGreaterThan(0.12);
  });

  it("measures how much of a picture is bright, mid and vivid", () => {
    const samples = [[255, 255, 255], [250, 245, 235], [90, 80, 70], [242, 107, 94]];
    expect(toneShares(samples)).toEqual({ bright: 50, light: 75, mid: 25, vivid: 25 });
    expect(toneShares([])).toEqual({ bright: 0, light: 0, mid: 0, vivid: 0 });
  });
});

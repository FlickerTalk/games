// When the app's secondary-text colour (`--ion-color-medium`) is used: only where it reads, at
// 4.5:1 or more, both on the page and on the kit's surface (6% of ink over the page). The table is
// what the app's frame really sends, per theme (2026-10-03).
import { describe, expect, it } from "vitest";
import { contrast, mediumReads, parseColour, surfaceOf } from "../src/colour.js";

const THEMES = {
  "mono light": { background: "#ffffff", ink: "#0a0a0a", medium: "#6e6e6e" },
  "mono dark": { background: "#000000", ink: "#f5f5f5", medium: "#8e8e8e" },
  "ember light": { background: "#fbf8f5", ink: "#1c1714", medium: "#7d726a" },
  "ember dark": { background: "#0d0b0a", ink: "#f6efe8", medium: "#9b8f86" },
  "aurora light": { background: "#f6f8fb", ink: "#121821", medium: "#66758a" },
  "aurora dark": { background: "#0a0e14", ink: "#eaf1fa", medium: "#8a97a8" },
};

describe("the app's secondary-text colour", () => {
  it("reads colours as the browser writes them", () => {
    expect(parseColour("#0fa89a")).toEqual([15, 168, 154]);
    expect(parseColour("#fff")).toEqual([255, 255, 255]);
    expect(parseColour(" rgb(28, 23, 20) ")).toEqual([28, 23, 20]);
    expect(parseColour("rgba(0, 0, 0, 0.5)")).toEqual([0, 0, 0]);
    expect(parseColour("color(srgb 1 0.5 0)")).toEqual([255, 128, 0]);
    expect(parseColour("transparent")).toBeNull();
    expect(parseColour("")).toBeNull();
  });

  it("measures contrast as WCAG does", () => {
    expect(contrast([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 1);
    expect(contrast([110, 110, 110], [255, 255, 255])).toBeCloseTo(5.1, 1);
    expect(surfaceOf([10, 10, 10], [255, 255, 255])).toEqual([240, 240, 240]);
  });

  it("is used in the three dark themes and not in the three light ones, where it falls below 4.5:1", () => {
    const reads = Object.fromEntries(Object.entries(THEMES).map(([name, theme]) => [name, mediumReads(theme)]));
    expect(reads).toEqual({
      "mono light": false, // 5.10 on the page, 4.47 on the surface
      "mono dark": true,
      "ember light": false, // 4.42 on the page
      "ember dark": true,
      "aurora light": false, // 4.41 on the page
      "aurora dark": true,
    });
    expect(mediumReads({ background: "#ffffff", ink: "#0a0a0a", medium: "" })).toBe(false);
  });
});

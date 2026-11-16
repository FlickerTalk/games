import { describe, expect, it } from "vitest";
import { contrastOf, cssOf, mixColours, oklchOf, readableOn, rgbaOf, softDay, softStage } from "../../src/canvas/tone.js";

const CSS = /^(?:#[0-9A-F]{6}|rgba\(\d{1,3}, \d{1,3}, \d{1,3}, (?:0|1|0\.\d+)\))$/;
const PALE = ["#EBD8B8", "#F4EBDD", "#E7DCC8", "#F3D8B5", "#DDF0E7", "#BDE4E2", "#C5DCCB"];
const hueGap = (one, two) => Math.abs(((one - two + 540) % 360) - 180);

describe("reading a colour", () => {
  it("reads hex, rgb and rgba, with or without spaces, and refuses anything else", () => {
    expect(rgbaOf("#fff")).toEqual([255, 255, 255, 1]);
    expect(rgbaOf("#0A0b0C")).toEqual([10, 11, 12, 1]);
    expect(rgbaOf("rgb(1, 2, 3)")).toEqual([1, 2, 3, 1]);
    expect(rgbaOf("rgba(255,240,225,0.07)")).toEqual([255, 240, 225, 0.07]);
    expect(rgbaOf(" rgba(0, 0, 0, 0.10) ")).toEqual([0, 0, 0, 0.1]);
    for (const wrong of ["", "red", "#12", "rgb(1, 2)", null, undefined, 12]) expect(rgbaOf(wrong), String(wrong)).toBeNull();
  });

  it("writes every colour one way: hex when opaque, rgba when not", () => {
    expect(cssOf([255, 0, 10, 1])).toBe("#FF000A");
    expect(cssOf([0, 0, 0, 0.1])).toBe("rgba(0, 0, 0, 0.1)");
    expect(cssOf([300, -4, 12.6, 1])).toBe("#FF000D");
    for (const colour of ["#abc", "rgba(10, 20, 30, 0.5)", "rgb(4, 5, 6)"]) expect(cssOf(rgbaOf(colour))).toMatch(CSS);
  });

  it("gives the lightness, chroma and hue of a colour the way the eye sees them", () => {
    expect(oklchOf("#000000").l).toBeCloseTo(0, 3);
    expect(oklchOf("#FFFFFF").l).toBeCloseTo(1, 3);
    expect(oklchOf("#808080").c).toBeLessThan(0.001);
    expect(oklchOf("#FF0000").c).toBeGreaterThan(0.2);
    expect(oklchOf("#F26B5E").l).toBeGreaterThan(oklchOf("#7167C9").l);
  });
});

describe("contrast", () => {
  it("measures it as WCAG does", () => {
    expect(contrastOf("#000000", "#FFFFFF")).toBeCloseTo(21, 1);
    expect(contrastOf("#777777", "#777777")).toBeCloseTo(1, 5);
    expect(contrastOf("#FFFFFF", "#767676")).toBeCloseTo(4.54, 1);
  });

  it("keeps a colour that already reads, and moves one that does not until it does", () => {
    expect(readableOn("#9E4C10", "#FFFFFF", 4.5)).toBe("#9E4C10");
    const fixed = readableOn("#E8731F", "#FBF8F5", 4.5);
    expect(contrastOf(fixed, "#FBF8F5")).toBeGreaterThanOrEqual(4.5);
    expect(hueGap(oklchOf(fixed).h, oklchOf("#E8731F").h)).toBeLessThan(12);
    expect(contrastOf(readableOn("#333333", "#000000", 7), "#000000")).toBeGreaterThanOrEqual(7);
  });

  it("mixes two colours in sRGB the way CSS color-mix does", () => {
    expect(mixColours("#F5F5F5", "#000000", 0.06)).toBe("#0F0F0F");
    expect(mixColours("#000000", "#FFFFFF", 0)).toBe("#FFFFFF");
    expect(mixColours("#000000", "#FFFFFF", 1)).toBe("#000000");
  });
});

describe("the soft day", () => {
  it("brings a pale scenery down to mid lightness on a dark page, keeping its hue", () => {
    for (const colour of PALE) {
      const soft = softDay(colour, { dark: true });
      expect(soft, colour).toMatch(CSS);
      const before = oklchOf(colour);
      const after = oklchOf(soft);
      expect(after.l, colour).toBeGreaterThanOrEqual(0.35);
      expect(after.l, colour).toBeLessThanOrEqual(0.58);
      expect(after.c, colour).toBeLessThanOrEqual(before.c + 0.001);
      if (before.c > 0.02) expect(hueGap(after.h, before.h), colour).toBeLessThan(8);
    }
  });

  it("only makes a pale scenery a little less pale on a light page, and leaves mid tones alone", () => {
    for (const colour of PALE) {
      const before = oklchOf(colour).l;
      const after = oklchOf(softDay(colour, { dark: false })).l;
      expect(after, colour).toBeLessThan(before);
      expect(before - after, colour).toBeLessThanOrEqual(0.07);
    }
    expect(softDay("#4C5877", { dark: false })).toBe("#4C5877");
  });

  it("keeps a colour's transparency", () => {
    expect(rgbaOf(softDay("rgba(255, 240, 166, 0.4)", { dark: true }))[3]).toBe(0.4);
  });

  it("softens a whole palette, frozen, leaving what is not a colour as it was", () => {
    const palette = { ground: "#EBD8B8", tree: { leaf: "#91BE82" }, list: ["#FFFDF5"], size: 3, name: "patio" };
    const soft = softStage(palette, { dark: true });
    expect(soft.ground).toBe(softDay("#EBD8B8", { dark: true }));
    expect(soft.tree.leaf).toBe(softDay("#91BE82", { dark: true }));
    expect(soft.list).toEqual([softDay("#FFFDF5", { dark: true })]);
    expect(soft.size).toBe(3);
    expect(soft.name).toBe("patio");
    expect(Object.isFrozen(soft.tree)).toBe(true);
    expect(palette.ground).toBe("#EBD8B8");
  });
});

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { COURT_UNIT, deckModule, encodePath, pathCommands, readDeck } from "../build.js";
import { decodePath } from "../src/path.js";
import * as DECK from "../src/deck.js";

const dir = join(import.meta.dirname, "..");
const vendor = join(dir, "vendor", "revk");
const deck = readDeck(vendor);

const near = (a, b, within) => a.every((value, at) => Math.abs(value - b[at]) <= within);

describe("reading the deck's paths", () => {
  it("turns relative steps, horizontal and vertical lines into absolute moves, lines and closes", () => {
    expect(pathCommands("M10 20l5 5h10v-5H0V0zm1 1L2 2")).toEqual([
      ["M", 10, 20],
      ["L", 15, 25],
      ["L", 25, 25],
      ["L", 25, 20],
      ["L", 0, 20],
      ["L", 0, 0],
      ["Z"],
      ["M", 11, 21],
      ["L", 2, 2],
    ]);
  });

  it("reads numbers written tightly, with signs and exponents, and repeats a command", () => {
    expect(pathCommands("M-1.5-2e1c1,1 2,2 3,3 1 1 2 2 3 3")).toEqual([
      ["M", -1.5, -20],
      ["C", -0.5, -19, 0.5, -18, 1.5, -17],
      ["C", 2.5, -16, 3.5, -15, 4.5, -14],
    ]);
    expect(pathCommands("M0 0 10 0 10 10")).toEqual([["M", 0, 0], ["L", 10, 0], ["L", 10, 10]]);
  });

  it("draws an arc as quarter-turn curves through the right points", () => {
    const half = pathCommands("M0 0A50 50 0 0 1 100 0");
    expect(half.map(([op]) => op)).toEqual(["M", "C", "C"]);
    expect(near(half[1].slice(5), [50, -50], 1e-9)).toBe(true);
    expect(near(half[2].slice(5), [100, 0], 1e-9)).toBe(true);
    const other = pathCommands("M0 0a50 50 0 0 0 100 0");
    expect(near(other[1].slice(5), [50, 50], 1e-9)).toBe(true);
  });
});

describe("the compact path text", () => {
  it("gives back every point within half a unit, and a small step costs one character", () => {
    const segments = pathCommands("M10 10C20 10 30 20 30 30L35 33Z");
    const decoded = decodePath(encodePath(segments, 1));
    expect(decoded).toEqual([0, 10, 10, 2, 20, 10, 30, 20, 30, 30, 1, 35, 33, 3]);
    const coarse = decodePath(encodePath(segments, 4));
    expect(near(coarse.slice(1, 3), [2.5, 2.5], 0.5)).toBe(true);
    expect(encodePath([["L", 3, -4]], 1)).toHaveLength(3);
    expect(encodePath([["L", 3, -4]], 1)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("writes a curve that runs straight within half a unit as a line, and a run of steps once", () => {
    expect(decodePath(encodePath([["M", 0, 0], ["C", 10, 0.2, 20, -0.4, 30, 0]], 1))).toEqual([0, 0, 0, 1, 30, 0]);
    expect(decodePath(encodePath([["M", 0, 0], ["C", 10, 3, 20, -3, 30, 0]], 1))).toEqual([0, 0, 0, 2, 10, 3, 20, -3, 30, 0]);
    const lines = encodePath([["M", 0, 0], ["L", 1, 1], ["L", 2, 2], ["L", 3, 3]], 1);
    expect(lines).toHaveLength(3 + 1 + 6);
  });
});

describe("the deck taken from the Plain deck of Adrian Kennard's playing cards", () => {
  it("has its four suits, thirteen rank signs and the pips of every number card", () => {
    expect(deck.suits).toHaveLength(4);
    expect(deck.ranks).toHaveLength(13);
    expect(deck.pips).toHaveLength(10);
    expect(deck.pips[0].top).toEqual([[0, 0]]);
    expect(deck.pips[0].turned).toEqual([]);
    for (let rank = 1; rank < 10; rank += 1) expect(deck.pips[rank].top.length + deck.pips[rank].turned.length, `rank ${rank + 1}`).toBe(rank + 1);
    expect(deck.pips[6].top).toContainEqual([0, -50.25]);
  });

  it("has the twelve court figures as one half each, in the six layers of the deck, with their suit marks", () => {
    expect(deck.courts).toHaveLength(12);
    for (const court of deck.courts) {
      expect(court.layers).toHaveLength(6);
      for (const layer of court.layers) expect(layer.length).toBeGreaterThan(50);
      expect(court.corner[1]).toBeCloseTo(-104.32, 2);
    }
    const jackOfDiamonds = deck.courts[2 * 3];
    expect(jackOfDiamonds.pips).toHaveLength(9);
    expect(jackOfDiamonds.pips[0]).toEqual([650, 1000, 200, 0, 1]);
    expect(deck.courts[0].pips.length).toBeGreaterThan(0);
  });

  it("keeps the courts small: coarse points, one half per figure, shared suit marks", () => {
    const text = deck.courts.flatMap((court) => court.layers).join("");
    expect(COURT_UNIT).toBeGreaterThanOrEqual(2);
    expect(text.length).toBeLessThan(80 * 1024);
  });

  it("is what src/deck.js holds (node games/eights/build.js writes it again)", () => {
    expect(readFileSync(join(dir, "src", "deck.js"), "utf8")).toBe(deckModule(deck));
    expect(DECK.COURTS).toHaveLength(12);
    expect(DECK.COURT_UNIT).toBe(COURT_UNIT);
    expect(DECK.SUITS).toEqual(deck.suits);
    expect(readdirSync(vendor).filter((name) => name.endsWith(".svg"))).toHaveLength(22);
  });
});

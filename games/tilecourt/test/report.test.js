import { describe, expect, it } from "vitest";
import { pieceOf } from "../src/pieces.js";
import { spots } from "../src/court.js";
import { MOST, decodeReport, encodeReport } from "../src/report.js";
import { placeInRound, startRound } from "../src/round.js";

function playOut(seed, pick = (found) => found[0]) {
  let round = startRound({ seed });
  while (!round.over) {
    const slot = round.slots.findIndex((id) => id && spots(round.court, pieceOf(id)).length);
    round = placeInRound(round, slot, pick(spots(round.court, pieceOf(round.slots[slot])))).round;
  }
  return round;
}

describe("a round's report", () => {
  it("fits a whole round of the main court in one move of at most 64 letters", () => {
    expect(MOST).toBe(56);
    for (let at = 0; at < 20; at += 1) {
      const round = playOut(`report${String(at).padStart(2, "0")}`, (found) => found.at(-1));
      const text = encodeReport(round);
      expect(text.length).toBeLessThanOrEqual(64);
      expect(text).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(text.startsWith(round.seed)).toBe(true);
      expect(decodeReport(text)).toEqual({ seed: round.seed, placements: round.placements });
    }
  });

  it("carries the order the pieces of each tray were laid in", () => {
    let round = startRound({ seed: "OrderMe1" });
    for (const slot of [2, 0, 1]) round = placeInRound(round, slot, spots(round.court, pieceOf(round.slots[slot]))[0]).round;
    expect(decodeReport(encodeReport(round)).placements.map(([slot]) => slot)).toEqual([2, 0, 1]);
  });

  it("is refused when it is not a report", () => {
    for (const wrong of [null, 7, "", "short", "AbCdEfGh!", "AbCdEfGhZ", "AbCdEfGhAAAAA", "AbCdEfGh" + "A".repeat(57), "AbCdEfGhAAA" + "é"]) {
      expect(decodeReport(wrong), String(wrong)).toBeNull();
    }
  });
});

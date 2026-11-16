import { describe, expect, it } from "vitest";
import { PIECES, pieceOf } from "../src/pieces.js";
import { STANDARD_MIX, dealTrays, mixFor } from "../src/trays.js";

const sizes = (trays) => trays.flat().map((id) => pieceOf(id).cells.length);

describe("dealing the trays", () => {
  it("deals twelve trays of three pieces from a seed, the same on every phone", () => {
    const trays = dealTrays("AbCdEfGh");
    expect(trays).toHaveLength(12);
    for (const tray of trays) {
      expect(tray).toHaveLength(3);
      for (const id of tray) expect(pieceOf(id)).not.toBeNull();
    }
    expect(dealTrays("AbCdEfGh")).toEqual(trays);
    expect(dealTrays("AbCdEfGi")).not.toEqual(trays);
  });

  it("deals any count of trays of any size, from the pieces it is given", () => {
    const small = PIECES.filter((piece) => piece.cells.length <= 4).map((piece) => piece.id);
    const trays = dealTrays("smallone", { count: 12, size: 1, pool: small });
    expect(trays).toHaveLength(12);
    expect(trays.every((tray) => tray.length === 1 && small.includes(tray[0]))).toBe(true);
  });

  it("gives mostly middle pieces and few large ones in the standard mix", () => {
    const counted = sizes(Array.from({ length: 40 }, (_, at) => dealTrays(`mix${at}`)).flat());
    const share = (test) => counted.filter(test).length / counted.length;
    expect(share((n) => n >= 5)).toBeGreaterThan(0.08);
    expect(share((n) => n >= 5)).toBeLessThan(0.22);
    expect(share((n) => n <= 2)).toBeGreaterThan(0.15);
  });

  it("gives more large pieces as the mix asks for them, never none of the small ones", () => {
    const share = (mix) => {
      const counted = sizes(Array.from({ length: 40 }, (_, at) => dealTrays(`mix${at}`, { mix })).flat());
      return counted.filter((n) => n >= 5).length / counted.length;
    };
    expect(share(mixFor(0.5))).toBeLessThan(share(STANDARD_MIX));
    expect(share(mixFor(2))).toBeGreaterThan(share(STANDARD_MIX));
    expect(mixFor(1)).toEqual(STANDARD_MIX);
    expect(mixFor(-3).every((weight) => weight >= 0)).toBe(true);
  });
});

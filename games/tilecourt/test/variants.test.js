import { describe, expect, it } from "vitest";
import { pieceOf } from "../src/pieces.js";
import { VARIANTS, variantOf } from "../src/variants.js";

describe("the courts a round can be played on", () => {
  it("are the main court, the small one, the big one with beds, and the court of the day", () => {
    expect(Object.keys(VARIANTS)).toEqual(["main", "small", "big", "daily"]);
    expect(VARIANTS.main).toMatchObject({ size: 8, tray: 3, trays: 12, beds: false, rescue: false });
    expect(VARIANTS.small).toMatchObject({ size: 6, tray: 1, trays: 12, beds: false, rescue: true });
    expect(VARIANTS.big).toMatchObject({ size: 9, tray: 3, trays: 12, beds: true, rescue: false });
    expect(VARIANTS.daily).toMatchObject({ size: 8, tray: 3, trays: 12, beds: false, rescue: false });
  });

  it("deal every piece on the big courts and only pieces of up to four tiles on the small one", () => {
    expect(VARIANTS.main.pool).toHaveLength(26);
    expect(VARIANTS.small.pool.every((id) => pieceOf(id).cells.length <= 4)).toBe(true);
    expect(VARIANTS.small.pool).toHaveLength(20);
  });

  it("fall back on the main court for a name they do not know", () => {
    expect(variantOf("small")).toBe(VARIANTS.small);
    expect(variantOf("nothing")).toBe(VARIANTS.main);
    expect(Object.isFrozen(VARIANTS) && Object.isFrozen(VARIANTS.main)).toBe(true);
  });
});

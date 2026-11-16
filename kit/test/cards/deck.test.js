import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as DECK from "../../src/cards/deck.js";

const root = join(import.meta.dirname, "..", "..", "..");

describe("the shared deck of playing cards", () => {
  it("is byte for byte the deck Crazy Eights builds from the vendored cards", () => {
    expect(readFileSync(join(root, "kit", "src", "cards", "deck.js"), "utf8")).toBe(readFileSync(join(root, "games", "eights", "src", "deck.js"), "utf8"));
  });

  it("has four suits, thirteen rank signs, the pips of the ten number cards and twelve court figures", () => {
    expect(DECK.SUITS).toHaveLength(4);
    expect(DECK.RANKS).toHaveLength(13);
    expect(DECK.PIPS).toHaveLength(10);
    expect(DECK.COURTS).toHaveLength(12);
    for (const court of DECK.COURTS) expect(court.layers).toHaveLength(6);
  });
});

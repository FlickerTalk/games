import { describe, expect, it } from "vitest";
import { visitorsOf } from "../src/pond.js";
import { MOST_LENGTH, decodeReport, encodeReport, readReport } from "../src/report.js";

describe("a round told to the other phone", () => {
  it("is the seed and one letter for each visitor caught, in the order they were caught", () => {
    const text = encodeReport("Pier0001", [3, 0, 27]);
    expect(text).toBe("Pier0001DAb");
    expect(decodeReport(text)).toEqual({ seed: "Pier0001", ids: [3, 0, 27] });
    expect(decodeReport("Pier0001")).toEqual({ seed: "Pier0001", ids: [] });
  });

  it("fits a move of the match, however many were caught", () => {
    const ids = visitorsOf("Pier0002").map((one) => one.id);
    const text = encodeReport("Pier0002", ids);
    expect(text.length).toBeLessThanOrEqual(MOST_LENGTH);
    expect(MOST_LENGTH).toBeLessThanOrEqual(64);
    expect(decodeReport(text).ids).toEqual(ids);
  });

  it("refuses anything that is not one", () => {
    for (const bad of [null, 7, "", "short", "Pier0001!", "Pier0001A".padEnd(MOST_LENGTH + 1, "A"), "Pi er0001A"]) expect(decodeReport(bad), String(bad)).toBeNull();
  });

  it("is read as the catch and the creatures it adds to the album, checked against the seed's own water", () => {
    const visitors = visitorsOf("Pier0003");
    const fish = visitors.filter((one) => typeof one.kind === "number").slice(0, 3);
    const find = visitors.find((one) => typeof one.kind === "string");
    const read = readReport(encodeReport("Pier0003", [...fish.map((one) => one.id), find.id]));
    expect(read).toEqual({ seed: "Pier0003", score: 4, kinds: [...new Set(fish.map((one) => one.kind))].sort((a, b) => a - b) });
    expect(readReport(encodeReport("Pier0003", [fish[0].id, fish[0].id]))).toBeNull();
    expect(readReport(encodeReport("Pier0003", [visitors.length]))).toBeNull();
    expect(readReport("not a report")).toBeNull();
  });
});

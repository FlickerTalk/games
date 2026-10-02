// cm-chessboard's markers sprite is CC BY-SA 3.0, so it does not ship: the game draws its own marks
// (the piece picked up, the last move, where it may go, a capture, the king in check) as plain
// shapes in the same 40-unit tile, in a sprite of its own that points nowhere.
import { describe, expect, it } from "vitest";
import { MARKER, MARKERS } from "../src/markers.js";

const ids = [...MARKERS.matchAll(/\sid="([^"]+)"/g)].map((found) => found[1]);

describe("the markers", () => {
  it("are one sprite holding every shape a marker uses, and nothing else", () => {
    expect(MARKERS).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="0" height="0" aria-hidden="true">/);
    const slices = [...new Set(Object.values(MARKER).map((type) => type.slice))].sort();
    expect([...ids].sort()).toEqual(slices);
    expect(Object.keys(MARKER).sort()).toEqual(["capture", "check", "last", "move", "pending", "pick"].sort());
    for (const type of Object.values(MARKER)) expect(type.class).toMatch(/^ftc-/);
  });

  it("draw the moves above the pieces, and the squares below them", () => {
    expect(MARKER.move.position).toBe("above");
    for (const name of ["pick", "last", "pending", "check", "capture"]) expect(MARKER[name].position, name).toBeUndefined();
  });

  it("point nowhere and hold no style", () => {
    expect(MARKERS.split("http").length - 1).toBe(1);
    expect(MARKERS).not.toMatch(/href|xlink|url\(|<image|<style|<script|style=/);
  });
});

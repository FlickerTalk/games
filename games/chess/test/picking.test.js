import { describe, expect, it } from "vitest";
import { choices, dropOn, tap } from "../src/picking.js";
import { START, initial, play, turn } from "../src/rules.js";

const after = (moves) => moves.reduce((state, move) => play(state, move, turn(state)).state, initial()).fen;
const TO_PROMOTE = after("a2a4 b7b5 a4b5 a7a6 b5a6 c8b7 a6b7 b8c6".split(" "));
const TO_CASTLE = after("e2e4 e7e5 g1f3 b8c6 f1c4 f8c5".split(" "));
const PASSING = after("e2e4 a7a6 e4e5 d7d5".split(" "));
const sorted = (list) => [...list].sort();
const targets = (offer) => sorted(offer.targets.map((one) => one.square));

describe("picking a move on the chess board", () => {
  it("offers the pieces that may move, the user's other pieces, then where the chosen one may go", () => {
    const start = choices(START, 0, true);
    expect(sorted(start.movable)).toEqual(["a2", "b1", "b2", "c2", "d2", "e2", "f2", "g1", "g2", "h2"]);
    expect(start.own).toHaveLength(16);
    expect(start.targets).toEqual([]);
    expect(choices(START, 0, true, "e2").targets).toEqual([{ square: "e3", capture: false, promotion: false }, { square: "e4", capture: false, promotion: false }]);
  });

  it("offers nothing out of turn, before the coin, or to the side not to move", () => {
    for (const offer of [choices(START, 0, false), choices(START, null, true), choices(START, 1, true)]) {
      expect(offer).toMatchObject({ legal: [], own: [], movable: [], targets: [] });
    }
  });

  it("marks a piece that may be taken, also in passing, and the king's castling square", () => {
    const taking = choices(after(["e2e4", "d7d5"]), 0, true, "e4");
    expect(taking.targets).toEqual(expect.arrayContaining([{ square: "d5", capture: true, promotion: false }, { square: "e5", capture: false, promotion: false }]));
    expect(choices(PASSING, 0, true, "e5").targets).toEqual(expect.arrayContaining([{ square: "d6", capture: true, promotion: false }]));
    expect(targets(choices(TO_CASTLE, 0, true, "e1"))).toEqual(["e2", "f1", "g1"]);
  });

  it("plays a move with two taps, switches to another piece, drops a choice tapped again, and shakes a piece that cannot move", () => {
    const offer = choices(START, 0, true);
    expect(tap(offer, null, "e2")).toEqual({ from: "e2", move: null, promote: null, miss: null });
    expect(tap(choices(START, 0, true, "e2"), "e2", "e4")).toEqual({ from: null, move: "e2e4", promote: null, miss: null });
    expect(tap(choices(START, 0, true, "e2"), "e2", "e2")).toEqual({ from: null, move: null, promote: null, miss: null });
    expect(tap(choices(START, 0, true, "e2"), "e2", "g1")).toEqual({ from: "g1", move: null, promote: null, miss: null });
    expect(tap(offer, null, "a1")).toEqual({ from: null, move: null, promote: null, miss: "a1" });
    expect(tap(offer, null, "e7")).toEqual({ from: null, move: null, promote: null, miss: null });
  });

  it("asks which piece a pawn becomes before playing a promotion, for a push and a capture alike", () => {
    const offer = choices(TO_PROMOTE, 0, true, "b7");
    expect(targets(offer)).toEqual(["a8", "b8"]);
    expect(offer.targets.every((one) => one.promotion)).toBe(true);
    expect(tap(offer, "b7", "a8")).toEqual({ from: null, move: null, promote: { from: "b7", to: "a8" }, miss: null });
  });

  it("lets a dragged piece land on a square it may reach, asks for a promotion, and refuses any other square", () => {
    expect(dropOn(choices(START, 0, true, "g1"), "g1", "f3")).toEqual({ move: "g1f3", promote: null });
    expect(dropOn(choices(TO_PROMOTE, 0, true, "b7"), "b7", "b8")).toEqual({ move: null, promote: { from: "b7", to: "b8" } });
    expect(dropOn(choices(START, 0, true, "e2"), "e2", "e5")).toBeNull();
  });
});

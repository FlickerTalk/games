import { describe, expect, it } from "vitest";
import { BURST_MS, MOVE_MS, SHAKE_MS, cuesBetween, moveFrame, planMove, shakeAt } from "../src/moves.js";
import { initial, play, turn } from "../src/rules.js";

const line = (moves, from = initial()) => moves.reduce((state, move) => play(state, move, turn(state)).state, from);
const step = (state, move) => [state.fen, play(state, move, turn(state)).state.fen, move];

describe("how a chess move is shown", () => {
  it("carries a piece straight from its square to the next", () => {
    expect(planMove(...step(initial(), "g1f3"))).toEqual({ piece: "N", landed: "N", from: "g1", to: "f3", captured: null, rook: null });
  });

  it("keeps a piece it takes on its square until the mover lands there, also a pawn taken in passing", () => {
    const taking = line(["e2e4", "d7d5"]);
    expect(planMove(...step(taking, "e4d5")).captured).toEqual({ square: "d5", piece: "p" });
    const passing = line(["e2e4", "a7a6", "e4e5", "d7d5"]);
    expect(planMove(...step(passing, "e5d6")).captured).toEqual({ square: "d5", piece: "p" });
  });

  it("moves the rook with the king when castling, either way", () => {
    const short = line("e2e4 e7e5 g1f3 b8c6 f1c4 f8c5".split(" "));
    expect(planMove(...step(short, "e1g1")).rook).toEqual({ piece: "R", from: "h1", to: "f1" });
    const long = line("d2d4 d7d5 b1c3 b8c6 c1f4 c8f5 d1d2 d8d7".split(" "));
    expect(planMove(...step(long, "e1c1")).rook).toEqual({ piece: "R", from: "a1", to: "d1" });
  });

  it("lands a promoted pawn as the piece chosen", () => {
    const promoting = line("a2a4 b7b5 a4b5 a7a6 b5a6 c8b7 a6b7 b8c6".split(" "));
    expect(planMove(...step(promoting, "b7a8n"))).toMatchObject({ piece: "P", landed: "N", captured: { square: "a8", piece: "r" } });
  });

  it("shows nothing moving when the new position does not follow from the old one by that move", () => {
    const [before, after] = step(initial(), "e2e4");
    expect(planMove(before, after, "d2d4")).toBeNull();
    expect(planMove(after, before, "e2e4")).toBeNull();
    expect(planMove(before, after, null)).toBeNull();
    expect(planMove(null, after, "e2e4")).toBeNull();
    expect(planMove(before, after, "e2e9")).toBeNull();
  });

  it("travels for a short, even time, then closes a ring on the piece taken", () => {
    const plan = planMove(...step(line(["e2e4", "d7d5"]), "e4d5"));
    expect(moveFrame(plan, 0)).toMatchObject({ progress: 0, standing: [{ square: "d5", piece: "p" }], bursts: [], done: false });
    expect(moveFrame(plan, MOVE_MS / 2).progress).toBeCloseTo(0.5, 6);
    expect(moveFrame(plan, MOVE_MS + BURST_MS / 2)).toMatchObject({ progress: 1, standing: [], bursts: [{ square: "d5", progress: 0.5 }], done: false });
    expect(moveFrame(plan, MOVE_MS + BURST_MS).done).toBe(true);
    expect(moveFrame(planMove(...step(initial(), "e2e4")), MOVE_MS).done).toBe(true);
  });

  it("lands at once a piece dropped by a finger, the ring following", () => {
    const plan = planMove(...step(line(["e2e4", "d7d5"]), "e4d5"));
    const now = moveFrame(plan, 10, { travel: false });
    expect(now.progress).toBe(1);
    expect(now.standing).toEqual([]);
    expect(now.bursts.map((one) => one.square)).toEqual(["d5"]);
  });

  it("names the sound of a capture once, when the mover lands", () => {
    const plan = planMove(...step(line(["e2e4", "d7d5"]), "e4d5"));
    expect(cuesBetween(plan, -1, MOVE_MS - 1)).toEqual([]);
    expect(cuesBetween(plan, MOVE_MS - 1, MOVE_MS + 5)).toEqual(["capture"]);
    expect(cuesBetween(plan, MOVE_MS + 5, MOVE_MS + 50)).toEqual([]);
    expect(cuesBetween(plan, -1, 0, { travel: false })).toEqual(["capture"]);
    expect(cuesBetween(planMove(...step(initial(), "e2e4")), -1, MOVE_MS)).toEqual([]);
  });

  it("shakes a piece briefly, side to side, never more than three times a second, then stills it", () => {
    expect(shakeAt(-1)).toBe(0);
    expect(shakeAt(SHAKE_MS)).toBe(0);
    const samples = Array.from({ length: 101 }, (_, at) => shakeAt((at / 100) * SHAKE_MS));
    expect(Math.max(...samples)).toBeGreaterThan(0.3);
    expect(Math.min(...samples)).toBeLessThan(-0.3);
    const peaks = samples.filter((value, at) => at > 0 && at < 100 && value > samples[at - 1] && value >= samples[at + 1]).length;
    expect(peaks / (SHAKE_MS / 1000)).toBeLessThanOrEqual(3);
    expect(SHAKE_MS).toBeLessThanOrEqual(600);
  });
});

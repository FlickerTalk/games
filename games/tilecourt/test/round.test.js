import { describe, expect, it } from "vitest";
import { EMPTY } from "../src/court.js";
import { pieceOf } from "../src/pieces.js";
import { VARIANTS } from "../src/variants.js";
import { placeInRound, replayRound, roundResult, startRound } from "../src/round.js";
import { spots } from "../src/court.js";

function firstFit(round) {
  for (let slot = 0; slot < round.slots.length; slot += 1) {
    const id = round.slots[slot];
    if (!id) continue;
    const found = spots(round.court, pieceOf(id));
    if (found.length) return [slot, found[0]];
  }
  return null;
}

function playOut(round) {
  let now = round;
  while (!now.over) {
    const [slot, at] = firstFit(now);
    now = placeInRound(now, slot, at).round;
  }
  return now;
}

describe("a round", () => {
  it("starts on an empty court with the first of twelve trays of three", () => {
    const round = startRound({ seed: "AbCdEfGh" });
    expect(round).toMatchObject({ variant: "main", seed: "AbCdEfGh", tray: 0, score: 0, over: null, placements: [] });
    expect(round.trays).toHaveLength(12);
    expect(round.slots).toEqual(round.trays[0]);
    expect(round.court.cells.every((cell) => cell === EMPTY)).toBe(true);
  });

  it("lays a piece from the tray, scores it and empties its slot, leaving the old round as it was", () => {
    const round = startRound({ seed: "AbCdEfGh" });
    const piece = pieceOf(round.slots[1]);
    const { round: next, events } = placeInRound(round, 1, 0);
    expect(events).toMatchObject({ slot: 1, at: 0, piece: piece.id, points: piece.cells.length, lines: [], tray: false, over: null });
    expect(next.slots[1]).toBeNull();
    expect(next.score).toBe(piece.cells.length);
    expect(next.placements).toEqual([[1, 0]]);
    expect(round.slots[1]).toBe(piece.id);
    expect(round.score).toBe(0);
  });

  it("refuses an empty slot, a cell where the piece does not fit, and anything once the round is over", () => {
    const round = startRound({ seed: "AbCdEfGh" });
    const once = placeInRound(round, 0, 0).round;
    expect(placeInRound(once, 0, 30)).toEqual({ error: "empty" });
    expect(placeInRound(once, 1, 0)).toEqual({ error: "taken" });
    expect(placeInRound(round, 5, 0)).toEqual({ error: "empty" });
    expect(placeInRound(round, 0, 64)).toEqual({ error: "taken" });
    const ended = playOut(round);
    expect(placeInRound(ended, 0, 0)).toEqual({ error: "over" });
  });

  it("brings the next tray when the third piece is laid, and ends after the twelfth or when nothing fits", () => {
    let round = startRound({ seed: "AbCdEfGh" });
    for (let laid = 0; laid < 3; laid += 1) {
      const [slot, at] = firstFit(round);
      const { round: next, events } = placeInRound(round, slot, at);
      expect(events.tray).toBe(laid === 2);
      round = next;
    }
    expect(round.tray).toBe(1);
    expect(round.slots).toEqual(round.trays[1]);
    const ended = playOut(round);
    expect(["done", "full"]).toContain(ended.over);
    if (ended.over === "done") expect(ended.placements).toHaveLength(36);
  });

  it("ends without words when nothing in the tray fits, keeping the score", () => {
    let seed = 0;
    let ended;
    do ended = playOut(startRound({ seed: `full${String(seed++).padStart(4, "0")}` }));
    while (ended.over !== "full" && seed < 400);
    expect(ended.over).toBe("full");
    const left = ended.slots.filter(Boolean).map(pieceOf);
    expect(left.length).toBeGreaterThan(0);
    for (const piece of left) expect(spots(ended.court, piece)).toEqual([]);
    expect(roundResult(ended)).toMatchObject({ score: ended.score, done: false });
  });

  it("gives back the same round when its placements are played again from the seed, and nothing for a wrong one", () => {
    const ended = playOut(startRound({ seed: "ReplayMe" }));
    const again = replayRound({ seed: "ReplayMe", placements: ended.placements });
    expect(again.score).toBe(ended.score);
    expect(again.court).toEqual(ended.court);
    expect(again.over).toBe(ended.over);
    expect(replayRound({ seed: "ReplayMe", placements: [[0, 0], [0, 0]] })).toBeNull();
    expect(replayRound({ seed: "ReplayMe", placements: [[0, "x"]] })).toBeNull();
  });

  it("plays the small court one piece at a time, pieces of up to four tiles, and never ends early", () => {
    expect(VARIANTS.small).toMatchObject({ size: 6, tray: 1, trays: 12 });
    for (let seed = 0; seed < 30; seed += 1) {
      const ended = playOut(startRound({ variant: "small", seed: `small${String(seed).padStart(3, "0")}` }));
      expect(ended.over).toBe("done");
      expect(ended.placements).toHaveLength(12);
      expect(ended.trays.flat().every((id) => pieceOf(id).cells.length <= 4)).toBe(true);
    }
  });

  it("lets the fullest line of the small court go by itself when the next piece would not fit", () => {
    const round = startRound({ variant: "small", seed: "rescue01" });
    const court = { size: 6, cells: Array.from({ length: 36 }, (_, at) => ((at % 6) + Math.floor(at / 6)) % 2 === 0 ? 1 : EMPTY) };
    const stuck = { ...round, court, slots: ["single"], trays: [["single"], ["square"]], tray: 0 };
    const { round: next, events } = placeInRound(stuck, 0, 1);
    expect(events.lines).toEqual([]);
    expect(events.rescued.length).toBeGreaterThan(0);
    expect(next.over).toBeNull();
    expect(spots(next.court, pieceOf("square")).length).toBeGreaterThan(0);
    expect(next.score).toBe(1);
  });

  it("plays the big court nine by nine, where a full bed of three by three also leaves", () => {
    expect(VARIANTS.big).toMatchObject({ size: 9, tray: 3, beds: true });
    const round = startRound({ variant: "big", seed: "bigcourt" });
    expect(round.court.cells).toHaveLength(81);
    const court = { size: 9, cells: Array(81).fill(EMPTY) };
    for (const at of [0, 1, 9, 10, 11, 18, 19, 20]) court.cells[at] = 2;
    const { events } = placeInRound({ ...round, court, slots: ["single", null, null], trays: [["single"], ["single", "single", "single"]] }, 0, 2);
    expect(events.lines.map(({ kind }) => kind)).toEqual(["bed"]);
  });
});

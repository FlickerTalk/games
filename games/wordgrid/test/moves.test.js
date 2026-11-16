import { describe, expect, it } from "vitest";
import { BURST_MS, HOP_GAP_MS, HOP_MS, SHAKE_MS, STEP_MS, planWord, shakeAt, wordFrame } from "../src/moves.js";
import { commitText, initial, play, revealText, seedText, turn } from "../src/rules.js";

const A = Uint8Array.from({ length: 24 }, (_, at) => at + 1);
const B = new Uint8Array(24).fill(0x5a);

function onGrid(letters) {
  let state = initial();
  for (const move of [commitText("en", A), seedText(B), revealText(A)]) state = play(state, move, turn(state)).state;
  return { ...state, grid: [...letters] };
}

const GRID = onGrid("catsoxeetnrfdlmp");
const after = (state, move) => play(state, move, turn(state)).state;

describe("a word said, shown on the grid", () => {
  it("finds the word just said, by whom and along which tiles", () => {
    const said = after(GRID, "wcat");
    expect(planWord(GRID, said)).toEqual({ side: 1, word: "cat", path: [0, 1, 2] });
    expect(planWord(said, after(said, "x"))).toBeNull();
    expect(planWord(said, said)).toBeNull();
    expect(planWord(initial(), GRID)).toBeNull();
    expect(planWord(null, said)).toBeNull();
  });

  it("traces the other side's word letter by letter, then hops its tiles in order and marks its end", () => {
    const plan = { side: 0, word: "cat", path: [0, 1, 2] };
    expect(wordFrame(plan, 0).traced).toEqual([0]);
    expect(wordFrame(plan, STEP_MS * 1.5).traced).toEqual([0, 1]);
    const traced = STEP_MS * 3;
    const hopping = wordFrame(plan, traced + HOP_GAP_MS * 1.5);
    expect(hopping.traced).toEqual([0, 1, 2]);
    expect(hopping.hops.map((hop) => hop.cell)).toEqual([0, 1, 2]);
    expect(hopping.hops[0].progress).toBeGreaterThan(hopping.hops[1].progress);
    expect(hopping.hops[2].progress).toBe(0);
    const marking = wordFrame(plan, traced + 2 * HOP_GAP_MS + HOP_MS / 2 + BURST_MS / 2);
    expect(marking.burst).toMatchObject({ cell: 2 });
    expect(marking.burst.progress).toBeGreaterThan(0);
    expect(marking.done).toBe(false);
    expect(wordFrame(plan, traced + 2 * HOP_GAP_MS + HOP_MS + BURST_MS).done).toBe(true);
  });

  it("hops the user's own word at once, the word already traced by a finger", () => {
    const plan = { side: 1, word: "cat", path: [0, 1, 2] };
    const frame = wordFrame(plan, HOP_MS / 2, { travel: false });
    expect(frame.traced).toEqual([0, 1, 2]);
    expect(frame.hops[0].progress).toBeCloseTo(0.5, 6);
  });

  it("shakes a word that will not do for a moment, then lets it rest", () => {
    expect(shakeAt(0)).toBe(0);
    expect(shakeAt(SHAKE_MS / 2)).toBeCloseTo(0.5, 6);
    expect(shakeAt(SHAKE_MS)).toBeNull();
  });
});

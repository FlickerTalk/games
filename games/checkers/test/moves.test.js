import { describe, expect, it } from "vitest";
import { BURST_MS, CROWN_MS, HOP_MS, STEP_MS, cuesBetween, moveFrame, planMove } from "../src/moves.js";
import { initial, play } from "../src/rules.js";

function fromRows(rows, next) {
  const marks = { d: 0, l: 1, D: 2, L: 3 };
  return { cells: rows.join("").split("").map((mark) => (mark in marks ? marks[mark] : null)), next, quiet: 0 };
}

const after = (state, move) => play(state, move, state.next).state;
const JUMPS = fromRows(["........", "........", ".....d..", "....l...", "........", "..l.....", "........", "........"], 0);
const CROWNING = fromRows(["........", "........", "........", "........", "........", "........", ".d......", "........"], 0);

describe("how a checkers move is shown", () => {
  it("walks a step from one square to the next", () => {
    const plan = planMove(initial(), after(initial(), "21-30"), "21-30");
    expect(plan).toMatchObject({ piece: 0, path: [21, 30], hops: [false], captured: [], crowned: false });
  });

  it("hops over each piece it takes, which stays on the board until it is jumped", () => {
    const plan = planMove(JUMPS, after(JUMPS, "21-35-49"), "21-35-49");
    expect(plan.hops).toEqual([true, true]);
    expect(plan.captured).toEqual([{ cell: 28, piece: 1, leg: 0 }, { cell: 42, piece: 1, leg: 1 }]);
  });

  it("crowns a man that reaches the far row", () => {
    const plan = planMove(CROWNING, after(CROWNING, "49-56"), "49-56");
    expect(plan).toMatchObject({ crowned: true, piece: 0, landed: 2 });
  });

  it("shows nothing moving when the new position does not follow from the old one by that move", () => {
    const moved = after(initial(), "21-30");
    expect(planMove(initial(), moved, "23-30")).toBeNull();
    expect(planMove(moved, initial(), "21-30")).toBeNull();
    expect(planMove(initial(), moved, null)).toBeNull();
    expect(planMove(null, moved, "21-30")).toBeNull();
  });

  it("takes each captured piece away as the mover passes over it, in a short burst", () => {
    const plan = planMove(JUMPS, after(JUMPS, "21-35-49"), "21-35-49");
    const start = moveFrame(plan, 0);
    expect(start).toMatchObject({ progress: 0, bursts: [], done: false });
    expect(start.standing.map((one) => one.cell)).toEqual([28, 42]);
    const over = moveFrame(plan, HOP_MS * 0.5 + 10);
    expect(over.standing.map((one) => one.cell)).toEqual([42]);
    expect(over.bursts.map((one) => one.cell)).toEqual([28]);
    const end = moveFrame(plan, HOP_MS * 2 + BURST_MS);
    expect(end).toMatchObject({ progress: 1, standing: [], bursts: [], done: true });
  });

  it("pops the crown on once the man has landed", () => {
    const plan = planMove(CROWNING, after(CROWNING, "49-56"), "49-56");
    expect(moveFrame(plan, STEP_MS / 2).crown).toBe(0);
    expect(moveFrame(plan, STEP_MS + CROWN_MS / 2).crown).toBeCloseTo(0.5, 6);
    expect(moveFrame(plan, STEP_MS + CROWN_MS).done).toBe(true);
    expect(moveFrame(planMove(initial(), after(initial(), "21-30"), "21-30"), 0).crown).toBeNull();
  });

  it("lands at once a piece dropped by a finger, its captures and crown following", () => {
    const plan = planMove(JUMPS, after(JUMPS, "21-35-49"), "21-35-49");
    const now = moveFrame(plan, 0, { travel: false });
    expect(now.progress).toBe(1);
    expect(now.bursts.map((one) => one.cell)).toEqual([28]);
    expect(now.standing.map((one) => one.cell)).toEqual([42]);
  });

  it("names the sounds of what starts between two frames", () => {
    const plan = planMove(JUMPS, after(JUMPS, "21-35-49"), "21-35-49");
    expect(cuesBetween(plan, -1, 10)).toEqual([]);
    expect(cuesBetween(plan, 10, HOP_MS)).toEqual(["capture"]);
    expect(cuesBetween(plan, 0, HOP_MS * 2)).toEqual(["capture", "capture"]);
    const crowning = planMove(CROWNING, after(CROWNING, "49-56"), "49-56");
    expect(cuesBetween(crowning, 0, STEP_MS)).toEqual(["crown"]);
  });
});

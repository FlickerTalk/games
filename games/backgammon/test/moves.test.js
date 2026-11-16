import { describe, expect, it } from "vitest";
import { HIT_MS, MOVE_MS, PASS_MS, ROLL_MS, SHAKE_MS, cuesBetween, moveFrame, planChange, shakeAt } from "../src/moves.js";
import { POINTS, initial, play } from "../src/rules.js";

function position(places, { bar = [0, 0], off = [0, 0], next = 0, dice = null } = {}) {
  const state = initial();
  state.points = Array.from({ length: POINTS }, () => [0, 0]);
  for (const [point, side, count] of places) state.points[point][side] = count;
  Object.assign(state, { bar, off, next });
  if (dice) Object.assign(state, { dice, left: dice[0] === dice[1] ? [dice[0], dice[0], dice[0], dice[0]] : [...dice] });
  return state;
}

const after = (state, move) => play(state, move, state.next).state;
const HITTING = position([[7, 0, 3], [4, 1, 1], [10, 0, 2], [20, 1, 14]], { dice: [3, 5] });
const ON_BAR = position([[5, 0, 13], [11, 1, 14], [20, 1, 1]], { bar: [1, 0], dice: [3, 1] });
const BEARING = position([[0, 0, 13], [3, 0, 2], [18, 1, 15]], { dice: [6, 2] });

describe("how a backgammon move is shown", () => {
  it("walks a checker from its point to where it lands, the die it used spent at once", () => {
    const plan = planChange(HITTING, after(HITTING, "m10-5"), "m10-5");
    expect(plan).toMatchObject({ kind: "move", side: 0, from: 10, to: 5, hit: false, dice: [3, 5], left: [3] });
  });

  it("hits a lone checker where it lands, which then goes to the bar", () => {
    const plan = planChange(HITTING, after(HITTING, "m7-4"), "m7-4");
    expect(plan).toMatchObject({ kind: "move", from: 7, to: 4, hit: true, left: [5] });
    expect(moveFrame(plan, MOVE_MS / 2)).toMatchObject({ progress: 0.5, hit: null, done: false });
    expect(moveFrame(plan, MOVE_MS + HIT_MS / 2)).toMatchObject({ progress: 1, hit: 0.5, done: false });
    expect(moveFrame(plan, MOVE_MS + HIT_MS).done).toBe(true);
  });

  it("brings a checker in from the bar, and takes one off into the tray", () => {
    expect(planChange(ON_BAR, after(ON_BAR, "mb-21"), "mb-21")).toMatchObject({ kind: "move", from: "b", to: 21, side: 0 });
    expect(planChange(BEARING, after(BEARING, "m3-o"), "m3-o")).toMatchObject({ kind: "move", from: 3, to: "o", left: [2] });
  });

  it("keeps the spent dice in view while the last checker of a turn travels", () => {
    const one = after(HITTING, "m10-5");
    const plan = planChange(one, after(one, "m10-7"), "m10-7");
    expect(after(one, "m10-7").dice).toBeNull();
    expect(plan).toMatchObject({ dice: [3, 5], left: [] });
  });

  it("rolls the dice once they are revealed, and holds the dice of a side that cannot move before it passes", () => {
    const rolling = { ...HITTING, dice: null, left: [] };
    const roll = planChange(rolling, HITTING, "rAAAA");
    expect(roll).toMatchObject({ kind: "roll", side: 0, dice: [3, 5] });
    expect(moveFrame(roll, ROLL_MS / 2)).toMatchObject({ tumble: 0.5, done: false });
    expect(moveFrame(roll, ROLL_MS).done).toBe(true);
    const stuck = position([[0, 0, 2], [1, 0, 2], [2, 0, 2], [3, 0, 2], [4, 0, 2], [5, 0, 2], [20, 0, 3], [11, 1, 14]], { bar: [0, 1], next: 1, dice: [6, 2] });
    const pass = planChange(stuck, after(stuck, "x"), "x");
    expect(pass).toMatchObject({ kind: "pass", side: 1, dice: [6, 2], left: [] });
    expect(moveFrame(pass, PASS_MS - 1).done).toBe(false);
    expect(moveFrame(pass, PASS_MS).done).toBe(true);
  });

  it("shows nothing moving when the new position does not follow from the old one by that move", () => {
    const moved = after(HITTING, "m10-5");
    expect(planChange(HITTING, moved, "m7-4")).toBeNull();
    expect(planChange(moved, HITTING, "m10-5")).toBeNull();
    expect(planChange(HITTING, moved, null)).toBeNull();
    expect(planChange(null, moved, "m10-5")).toBeNull();
    expect(planChange(HITTING, moved, "cAAAA")).toBeNull();
    expect(planChange({ ...HITTING, dice: null, left: [] }, moved, "rAAAA")).toBeNull();
  });

  it("lands at once a checker dropped by a finger, the hit checker still going to the bar", () => {
    const plan = planChange(HITTING, after(HITTING, "m7-4"), "m7-4");
    const now = moveFrame(plan, 0, { travel: false });
    expect(now).toMatchObject({ progress: 1, hit: 0 });
    expect(moveFrame(plan, HIT_MS, { travel: false }).done).toBe(true);
  });

  it("names the sounds of what happens between two frames: a checker set down, a hit, the dice", () => {
    const quiet = planChange(HITTING, after(HITTING, "m10-5"), "m10-5");
    expect(cuesBetween(quiet, -1, MOVE_MS - 1)).toEqual([]);
    expect(cuesBetween(quiet, MOVE_MS - 1, MOVE_MS)).toEqual(["move"]);
    expect(cuesBetween(planChange(HITTING, after(HITTING, "m7-4"), "m7-4"), -1, MOVE_MS + HIT_MS)).toEqual(["hit"]);
    expect(cuesBetween(quiet, -1, 0, { travel: false })).toEqual(["move"]);
    expect(cuesBetween(planChange({ ...HITTING, dice: null, left: [] }, HITTING, "rAAAA"), -1, 0)).toEqual(["dice"]);
  });

  it("shakes a checker that cannot move in one short swing, under three a second", () => {
    expect(shakeAt(-1)).toBe(0);
    expect(shakeAt(SHAKE_MS)).toBe(0);
    expect(shakeAt(SHAKE_MS / 4)).toBeGreaterThan(0);
    expect(shakeAt((SHAKE_MS * 3) / 4)).toBeLessThan(0);
    expect(SHAKE_MS).toBeGreaterThanOrEqual(1000 / 3);
  });
});

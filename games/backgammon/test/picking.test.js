import { describe, expect, it } from "vitest";
import { cannotMove, choices, dropOn, lastTurn, placeOf, tap, targetsOf } from "../src/picking.js";
import { POINTS, initial } from "../src/rules.js";

function position(places, { bar = [0, 0], off = [0, 0], next = 0, dice = null } = {}) {
  const state = initial();
  state.points = Array.from({ length: POINTS }, () => [0, 0]);
  for (const [point, side, count] of places) state.points[point][side] = count;
  Object.assign(state, { bar, off, next });
  if (dice) Object.assign(state, { dice, left: dice[0] === dice[1] ? [dice[0], dice[0], dice[0], dice[0]] : [...dice] });
  return state;
}

const OPENING = position(initial().points.flatMap((point, at) => point.flatMap((count, side) => (count ? [[at, side, count]] : []))), { dice: [3, 1] });
const ON_BAR = position([[5, 0, 13], [11, 1, 14], [20, 1, 1]], { bar: [1, 0], dice: [3, 1] });
const BEARING = position([[0, 0, 13], [3, 0, 2], [18, 1, 15]], { dice: [6, 2] });

describe("picking a move on the backgammon table", () => {
  it("offers the points a checker may leave, only to the side to move once its dice are rolled", () => {
    expect([...choices(OPENING, 0, true).sources].sort((a, b) => a - b)).toEqual([5, 7, 12, 23]);
    expect(choices(OPENING, 1, true).sources).toEqual([]);
    expect(choices(OPENING, 0, false).sources).toEqual([]);
    expect(choices({ ...OPENING, dice: null, left: [] }, 0, true).sources).toEqual([]);
    expect(choices(OPENING, null, true).sources).toEqual([]);
  });

  it("names the bar and the tray by keys of their own, and back in the rules' words", () => {
    expect(choices(ON_BAR, 0, true).sources).toEqual(["bar"]);
    expect(targetsOf(choices(ON_BAR, 0, true).legal, "bar").sort()).toEqual([21, 23]);
    expect(targetsOf(choices(BEARING, 0, true).legal, 3)).toEqual(["off", 1]);
    expect([placeOf("bar"), placeOf("off"), placeOf(7)]).toEqual(["b", "o", 7]);
  });

  it("offers each place a checker may reach once, however many dice take it there", () => {
    const all = position([[2, 0, 2], [18, 1, 15]], { dice: [6, 5] });
    expect(targetsOf(choices(all, 0, true).legal, 2)).toEqual(["off"]);
  });

  it("chooses a checker with a tap, moves it with a second, and puts it back or swaps it for another", () => {
    const { legal } = choices(OPENING, 0, true);
    expect(tap(legal, null, 7)).toEqual({ chosen: 7, move: null });
    expect(tap(legal, 7, 4)).toEqual({ chosen: null, move: "m7-4" });
    expect(tap(legal, 7, 7)).toEqual({ chosen: null, move: null });
    expect(tap(legal, 7, 5)).toEqual({ chosen: 5, move: null });
    expect(tap(legal, null, 3)).toEqual({ chosen: null, move: null });
    const bearing = choices(BEARING, 0, true).legal;
    expect(tap(bearing, 3, "off")).toEqual({ chosen: null, move: "m3-o" });
    expect(tap(choices(ON_BAR, 0, true).legal, "bar", 21)).toEqual({ chosen: null, move: "mb-21" });
  });

  it("tells a checker of the side to move that cannot move now from one that may, and from the other side's", () => {
    const offer = choices(ON_BAR, 0, true);
    expect(offer.own).toEqual([5, "bar"]);
    expect(cannotMove(offer, 5)).toBe(true);
    expect(cannotMove(offer, "bar")).toBe(false);
    expect(cannotMove(offer, 11)).toBe(false);
    expect(choices(ON_BAR, 0, false).own).toEqual([]);
  });

  it("plays a checker dropped where it may go, and nothing where it may not", () => {
    const { legal } = choices(OPENING, 0, true);
    expect(dropOn(legal, 7, 4)).toBe("m7-4");
    expect(dropOn(legal, 7, 2)).toBeNull();
    expect(dropOn(choices(BEARING, 0, true).legal, 3, "off")).toBe("m3-o");
  });

  it("finds the checker moves of the last turn, the one being played or, before its first move, the one before it", () => {
    const roll = ["cA", "sB", "rC"];
    expect(lastTurn([])).toEqual([]);
    expect(lastTurn([...roll, "m7-4", "m5-4"])).toEqual([{ from: 7, to: 4, side: 0 }, { from: 5, to: 4, side: 0 }]);
    expect(lastTurn([...roll, "m7-4", "m5-4", ...roll])).toEqual([{ from: 7, to: 4, side: 0 }, { from: 5, to: 4, side: 0 }]);
    expect(lastTurn([...roll, "m7-4", "m5-4", "cA", "sB"])).toHaveLength(2);
    expect(lastTurn([...roll, "m7-4", ...roll, "x", ...roll])).toEqual([]);
    expect(lastTurn([...roll, "mb-2", "m16-o", "m3-o", "m2-9"])).toEqual([
      { from: "b", to: 2, side: 1 },
      { from: 16, to: "o", side: 1 },
      { from: 3, to: "o", side: 0 },
      { from: 2, to: 9, side: 1 },
    ]);
  });
});

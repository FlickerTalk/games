import { describe, expect, it } from "vitest";
import { aim, confirm, openCells } from "../src/picking.js";
import { DEFAULT_FLEET, commitText, initial, play, turn } from "../src/rules.js";

const SALT = new Uint8Array(24).fill(0x5a);

function round(moves) {
  let state = initial();
  for (const move of [commitText(SALT, DEFAULT_FLEET), commitText(SALT, DEFAULT_FLEET), ...moves]) state = play(state, move, turn(state)).state;
  return state;
}

describe("aiming a shot", () => {
  it("leaves open only the cells this side has not fired at yet", () => {
    const state = round([">0", "m>5", "m>1"]);
    const open = openCells(state, 0);
    expect(open.size).toBe(98);
    expect(open.has(0) || open.has(1)).toBe(false);
    expect(openCells(state, 1).size).toBe(99);
  });

  it("chooses a cell on the first tap and fires on a second tap of the same cell or on the confirming target", () => {
    const open = new Set([4, 5, 6]);
    expect(aim(null, 5, open)).toEqual({ chosen: 5, fire: null });
    expect(aim(5, 6, open)).toEqual({ chosen: 6, fire: null });
    expect(aim(6, 6, open)).toEqual({ chosen: null, fire: 6 });
    expect(aim(6, 9, open)).toEqual({ chosen: 6, fire: null });
    expect(confirm(4, open)).toEqual({ chosen: null, fire: 4 });
    expect(confirm(9, open)).toEqual({ chosen: null, fire: null });
    expect(confirm(null, open)).toEqual({ chosen: null, fire: null });
  });
});

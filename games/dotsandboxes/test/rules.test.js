// The rules of dots and boxes as the kit asks for them: 40 lines between 5 × 5 dots, the fourth
// side of a box takes it and gives the turn again, the round ends when every line is drawn, and the
// side with more boxes wins.
import { describe, expect, it } from "vitest";
import { BOXES, H, LINES, boxesOf, count, initial, play, result, sidesOf, turn } from "../src/rules.js";

function after(...lines) {
  let state = initial();
  for (const line of lines) {
    const played = play(state, line, turn(state));
    if (played.error) throw new Error(`${line}: ${played.error}`);
    state = played.state;
  }
  return state;
}

describe("dots and boxes", () => {
  it("starts with 40 free lines and 16 empty boxes, side 0 to move", () => {
    expect([BOXES, H, LINES]).toEqual([4, 20, 40]);
    const state = initial();
    expect(state.lines.every((drawn) => !drawn)).toBe(true);
    expect(state.boxes).toEqual(Array(16).fill(null));
    expect(turn(state)).toBe(0);
  });

  it("knows the four sides of each box and the boxes each line borders", () => {
    expect(sidesOf(0)).toEqual([0, 4, 20, 21]);
    expect(sidesOf(5)).toEqual([5, 9, 26, 27]);
    expect(sidesOf(15)).toEqual([15, 19, 38, 39]);
    expect(boxesOf(0)).toEqual([0]);
    expect(boxesOf(4)).toEqual([0, 4]);
    expect(boxesOf(21)).toEqual([0, 1]);
    expect(boxesOf(39)).toEqual([15]);
  });

  it("alternates the sides while no box closes", () => {
    expect(turn(after(0))).toBe(1);
    expect(turn(after(0, 4))).toBe(0);
    expect(after(0, 4).lines.filter(Boolean)).toHaveLength(2);
  });

  it("gives the box, and the turn again, to whoever draws its fourth side", () => {
    const state = after(0, 4, 20, 21);
    expect(state.boxes[0]).toBe(1);
    expect(turn(state)).toBe(1);
    expect(count(state.boxes)).toEqual([0, 1]);
    // One line may close two boxes at once: the shared side, drawn last.
    const two = after(0, 4, 20, 1, 5, 22, 21);
    expect([two.boxes[0], two.boxes[1]]).toEqual([0, 0]);
    expect(turn(two)).toBe(0);
    expect(count(two.boxes)).toEqual([2, 0]);
  });

  it("refuses a line that is taken, off the board or out of turn", () => {
    expect(play(initial(), 40, 0)).toEqual({ error: "bad" });
    expect(play(initial(), -1, 0)).toEqual({ error: "bad" });
    expect(play(initial(), "0", 0)).toEqual({ error: "bad" });
    expect(play(initial(), 0, 1)).toEqual({ error: "turn" });
    expect(play(after(0), 0, 1)).toEqual({ error: "taken" });
  });

  it("ends when every line is drawn, with more boxes winning, or a draw", () => {
    let state = initial();
    for (let line = 0; line < LINES; line += 1) state = play(state, line, turn(state)).state;
    const ended = result(state);
    expect(ended).not.toBeNull();
    expect(ended.first + ended.second).toBe(16);
    expect(ended.winner).toBe(ended.first === ended.second ? null : ended.first > ended.second ? 0 : 1);
    expect(play(state, 0, turn(state))).toEqual({ error: "over" });
    expect(result(initial())).toBeNull();
  });

  it("never changes the state it is given", () => {
    const state = initial();
    const copy = structuredClone(state);
    play(state, 0, 0);
    expect(state).toEqual(copy);
  });
});

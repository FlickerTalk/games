import { describe, expect, it } from "vitest";
import { seeded } from "../../../kit/test/helpers.js";
import { required } from "../src/geometry.js";
import { FREE_PAGES, PAGE_ORDER, pageOf } from "../src/pages.js";
import { SHARED, fillMove } from "../src/shared.js";

const { initial, turn, play, result, robot } = SHARED;

function step(state, move, side = turn(state)) {
  const played = play(state, move, side);
  expect(played.error, `${move} by ${side}`).toBeUndefined();
  return played.state;
}

describe("a page coloured by two, in turns", () => {
  it("is a turn-based game of its own for the kit's match", () => {
    expect(SHARED.id).toBe("colourcorner");
    expect(SHARED.gv).toBe(1);
    expect(initial()).toEqual({ page: null, fills: {}, moves: 0 });
    expect(turn(initial())).toBe(0);
  });

  it("starts with the side that starts choosing the page, then the other side paints first", () => {
    const chosen = step(initial(), "castle");
    expect(chosen.page).toBe("castle");
    expect(turn(chosen)).toBe(1);
    const painted = step(chosen, fillMove(3, "5"));
    expect(painted.fills).toEqual({ 3: "5" });
    expect(turn(painted)).toBe(0);
  });

  it("refuses a page that does not exist, a zone off the page, a paint not in the palette, or a move out of turn", () => {
    expect(play(initial(), "nothing", 0).error).toBeDefined();
    expect(play(initial(), "castle", 1).error).toBe("turn");
    const chosen = step(initial(), "cat");
    for (const move of ["99:1", "3:zz", "3", "-1:2", "castle", "3:5:1"]) expect(play(chosen, move, 1).error, move).toBeDefined();
    expect(play(chosen, "3:5", 0).error).toBe("turn");
  });

  it("lets a zone be painted again, and ends without a winner once every zone a finger can reach has paint", () => {
    let state = step(initial(), "flower");
    state = step(state, "0:1");
    state = step(state, "0:2");
    expect(state.fills[0]).toBe("2");
    for (const zone of required(pageOf("flower"))) if (!result(state)) state = step(state, fillMove(zone, "r"));
    expect(result(state)).toEqual({ winner: null });
    expect(play(state, "0:1", turn(state)).error).toBe("over");
  });

  it("never changes the state it is given", () => {
    const state = step(initial(), "cat");
    const copy = structuredClone(state);
    play(state, "1:1", 1);
    expect(state).toEqual(copy);
  });
});

describe("Flick colouring with the player", () => {
  it("chooses one of the pages everyone has when it starts", () => {
    const random = seeded(4);
    for (let at = 0; at < 20; at += 1) expect(PAGE_ORDER.slice(0, FREE_PAGES)).toContain(robot.move(initial(), 0, {}, random));
  });

  it("paints a zone still blank, in the colour that zone suggests", () => {
    const random = seeded(9);
    let state = step(initial(), "dinosaur");
    const page = pageOf("dinosaur");
    for (let turns = 0; turns < 6; turns += 1) {
      const move = robot.move(state, turn(state), {}, random);
      const [zone, paint] = move.split(":");
      expect(state.fills[zone], move).toBeUndefined();
      expect(paint).toBe(String(page.regions[Number(zone)].s));
      state = step(state, move);
    }
  });

  it("plays a whole page with the player to its end", () => {
    const random = seeded(2);
    let state = initial();
    for (let moves = 0; moves < 200 && !result(state); moves += 1) state = step(state, robot.move(state, turn(state), {}, random));
    expect(result(state)).toEqual({ winner: null });
  });
});

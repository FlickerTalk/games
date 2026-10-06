// The rules of Sea Battle as the kit asks for them: two hidden fleets committed to by hash, shots
// answered move by move, a sunk ship declared with its cells, the last ship ending the firing,
// both fleets revealed and every answer checked against them.
import { describe, expect, it } from "vitest";
import { PLAYS } from "../../../preview/shots.js";
import {
  CELLS,
  DEFAULT_FLEET,
  FLEET_CELLS,
  SHIPS,
  SIZE,
  canonicalFleet,
  commitText,
  fleetText,
  honest,
  honestAnswer,
  initial,
  parseFleet,
  parseReveal,
  play,
  randomFleet,
  result,
  revealText,
  shipCells,
  turn,
  validFleet,
} from "../src/rules.js";

const SALT_A = Uint8Array.from({ length: 24 }, (_, at) => at + 1);
const SALT_B = new Uint8Array(24).fill(0x5a);
const FLEET = DEFAULT_FLEET;
/** Another fleet, for the other side: the same ships shifted down a row. */
const OTHER = DEFAULT_FLEET.map((ship) => ({ ...ship, start: ship.start + 10 })).filter((ship) => shipCells(ship));

/** Plays the moves in order, each by the side to move. */
function after(moves, from = initial()) {
  let state = from;
  for (const move of moves) {
    const played = play(state, move, turn(state));
    if (played.error) throw new Error(`${move}: ${played.error}`);
    state = played.state;
  }
  return state;
}

/** Both fleets committed: side 0 with FLEET and SALT_A, side 1 with `other` and SALT_B. */
const placed = (other = OTHER) => after([commitText(SALT_A, FLEET), commitText(SALT_B, other)]);

/** Side 0 fires at every cell of the other fleet in turn, side 1 at empty water; both answer
 *  honestly; then both reveal. */
function wholeGame(other = OTHER, reveals = [revealText(SALT_A, FLEET), revealText(SALT_B, other)]) {
  let state = placed(other);
  const targets = other.flatMap(shipCells);
  const water = Array.from({ length: CELLS }, (_, cell) => cell).filter((cell) => !FLEET.flatMap(shipCells).includes(cell));
  let hits = 0;
  let misses = 0;
  state = after([`>${targets[hits++]}`], state);
  while (state.phase === "fire") {
    const side = turn(state);
    const answer = honestAnswer(state, side, side === 0 ? FLEET : other);
    const last = answer.startsWith("s") && state.sunk[side].length + 1 === SHIPS.length;
    state = after([last ? answer : `${answer}>${side === 0 ? targets[hits++] : water[misses++]}`], state);
  }
  return after(reveals, state);
}

describe("a fleet", () => {
  it("is five ships of 5, 4, 3, 3 and 2 cells, inside a 10 × 10 sea, none over another", () => {
    expect(SIZE).toBe(10);
    expect(SHIPS).toEqual([5, 4, 3, 3, 2]);
    expect(FLEET_CELLS).toBe(17);
    expect(validFleet(FLEET)).toBe(true);
    expect(validFleet(OTHER)).toBe(true);
    expect(validFleet(FLEET.slice(1))).toBe(false);
    expect(validFleet([...FLEET.slice(1), { start: 11, o: "h", len: 5 }])).toBe(true, "the same ships in another order");
    expect(validFleet([...FLEET.slice(1), { start: 31, o: "h", len: 5 }])).toBe(false, "over the ship of four");
    expect(validFleet([...FLEET.slice(1), { start: 7, o: "h", len: 5 }])).toBe(false, "off the right edge");
    expect(validFleet([...FLEET.slice(1), { start: 60, o: "v", len: 5 }])).toBe(false, "off the bottom");
    expect(shipCells({ start: 11, o: "h", len: 5 })).toEqual([11, 12, 13, 14, 15]);
    expect(shipCells({ start: 31, o: "v", len: 4 })).toEqual([31, 41, 51, 61]);
    expect(shipCells({ start: 31, o: "x", len: 4 })).toBeNull();
  });

  it("is written one way for a move, read back, and written the kit's way for the hash", () => {
    expect(fleetText(FLEET)).toBe("11h531v436h358v273h3");
    expect(parseFleet("11h531v436h358v273h3")).toEqual(FLEET);
    expect(parseFleet("31v411h536h358v273h3")).toBeNull("not in order");
    expect(parseFleet("11h531v436h358v2")).toBeNull("a ship short");
    expect(parseFleet("11h531v436h358v273x3")).toBeNull();
    expect(canonicalFleet(FLEET)).toBe("B2,B3,B4,B5,B6;D2,E2,F2,G2;D7,D8,D9;F9,G9;H4,H5,H6");
  });

  it("is committed to in a move of 44 characters and revealed in one of 53", () => {
    const commit = commitText(SALT_A, FLEET);
    expect(commit).toMatch(/^c[A-Za-z0-9_-]{43}$/);
    expect(commitText(SALT_B, FLEET)).not.toBe(commit);
    const reveal = revealText(SALT_A, FLEET);
    expect(reveal).toHaveLength(53);
    expect(parseReveal(reveal)).toEqual({ salt: SALT_A, ships: FLEET });
    expect(parseReveal(`${reveal}x`)).toBeNull();
    expect(parseReveal(reveal.slice(0, 40))).toBeNull();
    expect(parseReveal(42)).toBeNull();
  });

  it("is laid out at random, whole, and the same for the same random numbers", () => {
    let seed = 1;
    const random = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const one = randomFleet(random);
    expect(validFleet(one)).toBe(true);
    seed = 1;
    expect(randomFleet(random)).toEqual(one);
    expect(validFleet(randomFleet())).toBe(true);
    expect(randomFleet(() => 0)).toEqual(DEFAULT_FLEET, "when nothing fits, the fleet the board starts with");
  });
});

describe("placing", () => {
  it("takes a commitment from side 0, then from side 1, and then the firing begins with side 0", () => {
    const state = initial();
    expect(state.phase).toBe("place");
    expect(turn(state)).toBe(0);
    const one = after([commitText(SALT_A, FLEET)]);
    expect(turn(one)).toBe(1);
    expect(one.phase).toBe("place");
    const both = placed();
    expect(both.phase).toBe("fire");
    expect(turn(both)).toBe(0);
    expect(result(both)).toBeNull();
  });

  it("refuses anything but a commitment, a commitment out of turn, or a shot before both are in", () => {
    expect(play(initial(), ">11", 0)).toEqual({ error: "bad" });
    expect(play(initial(), "cshort", 0)).toEqual({ error: "bad" });
    expect(play(initial(), commitText(SALT_A, FLEET), 1)).toEqual({ error: "turn" });
    expect(play(initial(), 11, 0)).toEqual({ error: "bad" });
    expect(play(initial(), "", 0)).toEqual({ error: "bad" });
    expect(play(initial(), "x".repeat(65), 0)).toEqual({ error: "bad" });
  });
});

describe("firing", () => {
  it("takes a shot without an answer only from side 0 at first, then an answer with every shot", () => {
    const state = placed();
    expect(play(state, "m>5", 0)).toEqual({ error: "illegal" }, "nothing to answer yet");
    const one = after([">21"], state);
    expect(one.shots[0]).toEqual([21]);
    expect(turn(one)).toBe(1);
    expect(play(one, ">5", 1)).toEqual({ error: "illegal" }, "an answer is owed");
    expect(play(one, "x>5", 1)).toEqual({ error: "bad" });
    expect(play(one, "h>100", 1)).toEqual({ error: "bad" });
    const two = after(["h>5"], one);
    expect(two.answers[1]).toEqual(["h"]);
    expect(two.shots[1]).toEqual([5]);
  });

  it("never lets a side fire twice at one cell", () => {
    const state = after([">21", "h>5"], placed());
    expect(play(state, "m>21", 0)).toEqual({ error: "illegal" });
    expect(play(state, "m>22", 0).error).toBeUndefined();
  });

  it("knows the honest answer from the fleet: miss, hit, or sunk with the ship", () => {
    const state = placed();
    expect(honestAnswer(state, 1, OTHER)).toBe("", "nothing fired yet");
    expect(honestAnswer(after([">0"], state), 1, OTHER)).toBe("m");
    expect(honestAnswer(after([">21"], state), 1, OTHER)).toBe("h");
    // Side 0 fires the whole ship of five of the other fleet (cells 21–25), side 1 misses.
    const line = after([">21", "h>0", "m>22", "h>1", "m>23", "h>2", "m>24", "h>3", "m>25"], state);
    expect(honestAnswer(line, 1, OTHER)).toBe("s21h5");
    const sunk = after(["s21h5>4"], line);
    expect(sunk.sunk[1]).toEqual([{ start: 21, o: "h", len: 5 }]);
  });

  it("refuses a sunk ship that does not hold together with the earlier answers", () => {
    const state = after([">21", "h>0", "m>22", "h>1", "m>23", "h>2", "m>24", "h>3", "m>25"], placed());
    expect(play(state, "s21h5>4", 1).error).toBeUndefined();
    expect(play(state, "s21v5>4", 1)).toEqual({ error: "illegal" }, "those cells were not all hit");
    expect(play(state, "s20h5>4", 1)).toEqual({ error: "illegal" }, "the shot is not in the ship");
    // A ship of four over 22–25 holds together for now (21 would be a hit on no ship): the rules
    // check what they can move by move, and the rest at the reveal.
    expect(play(state, "s22h4>4", 1).error).toBeUndefined();
    expect(play(state, "s23h3>4", 1).error).toBeUndefined("a ship of three on three hit cells is possible");
    const twice = after(["s21h5>4"], state);
    // Another five cannot be sunk: the fleet has one ship of five.
    const more = after(["m>31", "h>5", "m>32", "h>6", "m>33", "h>7", "m>34", "h>8", "m>35"], twice);
    expect(play(more, "s31h5>9", 1)).toEqual({ error: "illegal" });
    expect(play(more, "s32h4>9", 1).error).toBeUndefined();
  });

  it("ends the firing when a side's answer sinks its last ship, with no shot in that move", () => {
    const state = wholeGame(OTHER, []);
    expect(state.phase).toBe("reveal");
    expect(state.sunk[1]).toHaveLength(5);
    expect(turn(state)).toBe(0, "the side still afloat reveals first");
    expect(result(state)).toBeNull();
    expect(play(state, ">99", 0)).toEqual({ error: "bad" });
  });
});

describe("revealing", () => {
  it("gives the round to the side afloat when both fleets match their commitments and answers", () => {
    const state = wholeGame();
    expect(state.phase).toBe("done");
    expect(result(state)).toEqual({ winner: 0, reason: "sunk" });
    expect(state.reveals[1].ships).toEqual(OTHER);
    expect(play(state, revealText(SALT_A, FLEET), 0)).toEqual({ error: "over" });
  });

  it("gives the round to the sunk side when the other's fleet does not match its commitment", () => {
    const wrongSalt = wholeGame(OTHER, [revealText(SALT_B, FLEET), revealText(SALT_B, OTHER)]);
    expect(result(wrongSalt)).toEqual({ winner: 1, reason: "cheat" });
    const otherFleet = wholeGame(OTHER, [revealText(SALT_A, OTHER), revealText(SALT_B, OTHER)]);
    expect(result(otherFleet)).toEqual({ winner: 1, reason: "cheat" });
  });

  it("catches a side that answered miss on a ship, or hit on water, or kept quiet about a sinking", () => {
    // Side 1's fleet has a ship at 21–25; it answers "m" at 21.
    const lie = after([">21", "m>0", "m>22", "h>1"], placed());
    expect(honest(lie, 1, OTHER)).toBe(false);
    expect(honest(lie, 0, FLEET)).toBe(true, "side 0 answered honestly: 0 is water, 1 is water");
    const water = after([">0", "h>0"], placed());
    expect(honest(water, 1, OTHER)).toBe(false);
    const quiet = after([">21", "h>0", "m>22", "h>1", "m>23", "h>2", "m>24", "h>3", "m>25", "h>4"], placed());
    expect(honest(quiet, 1, OTHER)).toBe(false, "the ship was sunk at 25 and had to be declared");
  });

  it("is a draw when neither fleet matches what it answered", () => {
    const state = wholeGame(OTHER, [revealText(SALT_B, FLEET), revealText(SALT_A, OTHER)]);
    expect(result(state)).toEqual({ winner: null, reason: "both" });
  });

  it("plays the screenshot line to a win for the starter", () => {
    const { opening, winning, draw } = PLAYS.seabattle;
    expect(draw).toBeNull();
    expect(result(after(opening))).toBeNull();
    expect(result(after([...opening, ...winning]))).toEqual({ winner: 0, reason: "sunk" });
  });

  it("never changes the state it is given", () => {
    const state = after([">21"], placed());
    const copy = structuredClone(state);
    play(state, "h>5", 1);
    expect(state).toEqual(copy);
  });
});

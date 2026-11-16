import { describe, expect, it } from "vitest";
import { DEFAULT_FLEET, commitText, honestAnswer, initial, play, revealText, turn } from "../src/rules.js";
import { myWaters, theirWaters } from "../src/waters.js";

const SALT = new Uint8Array(24).fill(0x5a);
const OTHER = DEFAULT_FLEET.map((ship) => ({ ...ship, start: ship.start + 10 }));

function replay(fleets, shots) {
  const game = { state: initial() };
  game.go = (move) => {
    const played = play(game.state, move, turn(game.state));
    if (played.error) throw new Error(`${move}: ${played.error}`);
    game.state = played.state;
  };
  game.go(commitText(SALT, fleets[0]));
  game.go(commitText(SALT, fleets[1]));
  for (const cell of shots) {
    const side = turn(game.state);
    game.go(`${honestAnswer(game.state, side, fleets[side])}>${cell}`);
  }
  return game;
}

describe("what this seat knows of the other side's waters", () => {
  it("is only what came back from its own shots: misses, hits, and the ships the other side said were sunk", () => {
    const { state } = replay([DEFAULT_FLEET, DEFAULT_FLEET], [11, 0, 12, 1, 13, 2, 14, 3, 15, 4]);
    const waters = theirWaters(state, 1);
    expect([...waters.shots.entries()].sort(([a], [b]) => a - b)).toEqual([[0, "m"], [1, "m"], [2, "m"], [3, "m"], [4, null]]);
    const mine = theirWaters(state, 0);
    expect(mine.found).toEqual([{ start: 11, o: "h", len: 5 }]);
    expect([11, 12, 13, 14, 15].map((cell) => mine.shots.get(cell))).toEqual(["s", "s", "s", "s", "s"]);
    expect(mine.shown).toEqual([]);
    expect(mine.last).toBe(15);
  });

  it("is the same whatever fleet the other side hides, as long as it answered the same", () => {
    const shots = [0, 0, 41, 41, 99, 99, 51, 51];
    const one = replay([DEFAULT_FLEET, DEFAULT_FLEET], shots).state;
    const two = replay([DEFAULT_FLEET, OTHER], shots).state;
    expect(two.answers).toEqual(one.answers);
    expect(theirWaters(two, 0)).toEqual(theirWaters(one, 0));
  });

  it("shows the other fleet only once both fleets are revealed and the round is done", () => {
    const targets = [21, 22, 23, 24, 25, 41, 51, 61, 71, 46, 47, 48, 68, 78, 83, 84, 85];
    const water = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 16, 17, 18, 19, 20, 21];
    const game = replay([OTHER, DEFAULT_FLEET], targets.flatMap((cell, at) => [water[at], cell]));
    game.go(honestAnswer(game.state, 0, OTHER));
    expect(game.state.phase).toBe("reveal");
    game.go(revealText(SALT, DEFAULT_FLEET));
    expect(game.state.reveals[1]).not.toBeNull();
    expect(theirWaters(game.state, 0).shown).toEqual([]);
    game.go(revealText(SALT, OTHER));
    expect(game.state.phase).toBe("done");
    expect(theirWaters(game.state, 1).shown).toEqual([]);
    expect(theirWaters(game.state, 1).found).toHaveLength(5);
    expect(theirWaters(game.state, 0).found).toHaveLength(0);
    expect(theirWaters(game.state, 0).shown).toEqual(DEFAULT_FLEET);
  });
});

describe("what this seat knows of its own waters", () => {
  it("is its own fleet and where the other side fired, each shot's result read from that fleet at once", () => {
    const { state } = replay([DEFAULT_FLEET, DEFAULT_FLEET], [0, 11, 1, 12]);
    const waters = myWaters(state, 0, DEFAULT_FLEET);
    expect(waters.shots.get(11)).toBe("h");
    expect(waters.shots.get(12)).toBe("h");
    expect(waters.ships.map((one) => one.found)).toEqual([false, false, false, false, false]);
    expect(waters.last).toBe(12);
    const sunk = replay([DEFAULT_FLEET, DEFAULT_FLEET], [0, 58, 1, 68]).state;
    const down = myWaters(sunk, 0, DEFAULT_FLEET);
    expect(down.ships.find((one) => one.ship.start === 58).found).toBe(true);
    expect([58, 68].map((cell) => down.shots.get(cell))).toEqual(["s", "s"]);
  });

  it("falls back on the answers it gave when its fleet is no longer on this phone", () => {
    const { state } = replay([DEFAULT_FLEET, DEFAULT_FLEET], [0, 11, 1, 12]);
    const waters = myWaters(state, 0, null);
    expect(waters.ships).toEqual([]);
    expect(waters.shots.get(11)).toBe("h");
    expect(waters.shots.get(12)).toBeNull();
  });
});

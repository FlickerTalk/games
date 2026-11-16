import { describe, expect, it } from "vitest";
import { startRound } from "../src/round.js";
import { flickFinish, flickStart, flickUpTo } from "../src/flick.js";
import { mixFor } from "../src/trays.js";

const setup = { variant: "main", seed: "FlickRun", mix: mixFor(0.8), skill: 0.6 };

describe("Flick playing along", () => {
  it("gets exactly the player's trays", () => {
    const flick = flickStart(setup);
    expect(flick.round.trays).toEqual(startRound(setup).trays);
    expect(flick.round.placements).toEqual([]);
  });

  it("lays its trays only as far as the player has, so its score grows with theirs", () => {
    const flick = flickStart(setup);
    flickUpTo(flick, 1);
    expect(flick.round.tray === 1 || flick.round.over).toBeTruthy();
    const after = flick.round.score;
    flickUpTo(flick, 1);
    expect(flick.round.score).toBe(after);
    flickUpTo(flick, 4);
    expect(flick.round.tray >= 4 || flick.round.over).toBeTruthy();
    expect(flick.round.score).toBeGreaterThan(after);
  });

  it("finishes its round when the player's ends, the same way every time", () => {
    const one = flickStart(setup);
    flickUpTo(one, 3);
    flickFinish(one);
    const two = flickStart(setup);
    flickFinish(two);
    expect(one.round.over).not.toBeNull();
    expect(two.round.placements).toEqual(one.round.placements);
  });
});

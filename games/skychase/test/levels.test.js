import { describe, expect, it } from "vitest";
import { roundSeconds } from "../../../kit/src/progress/index.js";
import { TWISTS } from "../src/arena.js";
import { FAMILIES } from "../src/craft.js";
import { COLOURS, FLICK_COLOUR, HELICOPTERS, LOOKS, PLANES, PROGRESS, SKIES, colourFor, familyOf, rivalCraft, settingsFor, wonRound } from "../src/levels.js";

describe("levels and looks", () => {
  it("offers planes and helicopters to choose from, three planes and two helicopters from the start, the rest as gifts", () => {
    expect(Object.keys(LOOKS)).toEqual(["plane", "helicopter"]);
    expect(PLANES).toHaveLength(6);
    expect(HELICOPTERS).toHaveLength(4);
    const fresh = PROGRESS.fresh();
    expect(PROGRESS.owned(fresh).toSorted()).toEqual(["biplane", "bubble", "jet", "propeller", "tandem"]);
    expect(fresh.chosen).toEqual({ plane: "propeller", helicopter: "bubble" });
    expect(PROGRESS.schedule.map((one) => one.look)).toEqual(["seaplane", "rescue", "stunt", "saucer", "paper"]);
  });

  it("keeps a tab of looks to six at most, so it fits the smallest room", () => {
    for (const looks of Object.values(LOOKS)) expect(looks.length).toBeLessThanOrEqual(6);
  });

  it("says which family an aircraft handles as, each a family the sky knows", () => {
    for (const plane of PLANES) expect(familyOf(plane)).toBe("plane");
    for (const copter of HELICOPTERS) expect(familyOf(copter)).toBe("helicopter");
    expect(familyOf("nothing")).toBe("plane");
    expect(Object.keys(FAMILIES)).toEqual(["plane", "helicopter"]);
  });

  it("gives Flick another aircraft of the player's own family and another colour", () => {
    for (const craft of [...PLANES, ...HELICOPTERS]) {
      expect(rivalCraft(craft)).not.toBe(craft);
      expect(familyOf(rivalCraft(craft))).toBe(familyOf(craft));
      expect(PROGRESS.owned(PROGRESS.fresh())).toContain(rivalCraft(craft));
    }
    expect(COLOURS).toHaveLength(5);
    expect(colourFor("sunny")).toBe(FLICK_COLOUR);
    expect(colourFor(FLICK_COLOUR)).not.toBe(FLICK_COLOUR);
  });

  it("stops getting harder at level 6: a surer pilot and a fuller sky until then", () => {
    expect(PROGRESS.plateau).toBe(6);
    const at = (level) => settingsFor({ ...PROGRESS.fresh(), level }, "flick", "seedAAAA");
    expect(at(1)).toMatchObject({ level: 1, twists: 0, seconds: roundSeconds(1) });
    expect(at(1).skill).toBeCloseTo(0.3);
    expect(at(3).twists).toBe(2);
    expect(at(6).twists).toBe(TWISTS.length - 1);
    expect(at(6).skill).toBeGreaterThan(at(5).skill);
    expect(at(30).skill).toBe(at(6).skill);
    expect(at(30).skill).toBeLessThan(0.9);
  });

  it("changes the sky with the level, round and round the five places", () => {
    const at = (level) => settingsFor({ ...PROGRESS.fresh(), level }, "flick", "seedAAAA").place;
    expect([1, 2, 3, 4, 5, 6].map(at)).toEqual([...SKIES, SKIES[0]]);
  });

  it("makes Flick clumsier after two lost rounds in a row", () => {
    const lost = settingsFor({ ...PROGRESS.fresh(), level: 3, losses: 2 }, "flick", "seedAAAA");
    const plain = settingsFor({ ...PROGRESS.fresh(), level: 3 }, "flick", "seedAAAA");
    expect(lost.eased).toBe(true);
    expect(lost.skill).toBeLessThan(plain.skill);
  });

  it("gives two friends the same full sky and place from their shared seed, whatever their own levels", () => {
    const one = settingsFor({ ...PROGRESS.fresh(), level: 1 }, "friend", "seedAAAA");
    const two = settingsFor({ ...PROGRESS.fresh(), level: 9, losses: 2 }, "friend", "seedAAAA");
    expect(one).toEqual(two);
    expect(one.twists).toBe(TWISTS.length - 1);
    expect(SKIES).toContain(one.place);
    const places = new Set(["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"].map((seed) => settingsFor(PROGRESS.fresh(), "friend", seed).place));
    expect(places.size).toBeGreaterThan(2);
  });

  it("counts a round as won only with more balloons popped than the other", () => {
    expect(wonRound(2, 1)).toBe(true);
    expect(wonRound(1, 1)).toBe(false);
    expect(wonRound(0, 3)).toBe(false);
  });
});

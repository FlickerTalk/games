import { describe, expect, it } from "vitest";
import { EXPRESSIONS, FLICK, HAIRS, HAIR_COLOURS, POSES, PROFILES, colourOf, hairOf, profileOf } from "../../src/avatars/cast.js";

const frozen = (list) => Object.isFrozen(list) && list.every((one) => Object.isFrozen(one));

describe("the cast", () => {
  it("has twelve profiles under the ids phones keep, each with its own colour and its own emblem", () => {
    expect(PROFILES.map((one) => one.id)).toEqual(["ari", "noa", "milo", "juno", "kit", "lou", "rio", "sam", "umi", "val", "zuri", "nico"]);
    expect(new Set(PROFILES.map((one) => one.colour.toLowerCase())).size).toBe(12);
    expect(new Set(PROFILES.map((one) => one.emblem)).size).toBe(12);
    for (const one of PROFILES) {
      expect(one.colour).toMatch(/^#[0-9a-f]{6}$/i);
      expect(one.name.length).toBeGreaterThan(0);
      expect(one.name.length).toBeLessThanOrEqual(12);
    }
    expect(frozen(PROFILES)).toBe(true);
  });

  it("keeps Flick apart from the profiles a player can be", () => {
    expect(FLICK).toMatchObject({ id: "flick", name: "Flick", emblem: "bolt" });
    expect(Object.isFrozen(FLICK)).toBe(true);
    expect(PROFILES.map((one) => one.id)).not.toContain("flick");
    expect(PROFILES.map((one) => one.emblem)).not.toContain("bolt");
  });

  it("has nine long looks, nine short looks and no hair, under the ids phones keep", () => {
    expect(HAIRS.map((one) => one.id)).toEqual([
      "none",
      "long-fringe",
      "ponytail",
      "braids",
      "long-braid",
      "bun",
      "bob",
      "curly-puff",
      "two-puffs",
      "wavy-headband",
      "messy-fringe",
      "short-crop",
      "side-part",
      "spiky",
      "curls",
      "quiff",
      "undercut",
      "cap",
      "mini-twists",
    ]);
    const count = (group) => HAIRS.filter((one) => one.group === group).length;
    expect([count("none"), count("long"), count("short")]).toEqual([1, 9, 9]);
    expect(frozen(HAIRS)).toBe(true);
  });

  it("has six hair colours under the ids phones keep", () => {
    expect(HAIR_COLOURS.map((one) => one.id)).toEqual(["ink", "chestnut", "copper", "golden", "cream", "silver"]);
    for (const one of HAIR_COLOURS) expect(one.colour).toMatch(/^#[0-9a-f]{6}$/i);
    expect(frozen(HAIR_COLOURS)).toBe(true);
  });

  it("names its twelve expressions and its eight poses", () => {
    expect(EXPRESSIONS).toEqual(["neutral", "confident", "focused", "happy", "laughing", "surprised", "determined", "dizzy", "sleepy", "cheering", "thinking", "oops"]);
    expect(POSES).toEqual(["idle", "run", "jump", "swing", "kick", "block", "celebrate", "lose"]);
    expect(Object.isFrozen(EXPRESSIONS) && Object.isFrozen(POSES)).toBe(true);
  });

  it("finds a profile, a hairstyle and a colour by id, and the first of each for anything else", () => {
    expect(profileOf("milo")).toBe(PROFILES[2]);
    expect(profileOf("flick")).toBe(FLICK);
    for (const unknown of [undefined, null, 3, "Milo", "__proto__", "constructor", {}, []]) {
      expect(profileOf(unknown), String(unknown)).toBe(PROFILES[0]);
      expect(hairOf(unknown), String(unknown)).toBe(HAIRS[0]);
      expect(colourOf(unknown), String(unknown)).toBe(HAIR_COLOURS[0]);
    }
    expect(hairOf("quiff").id).toBe("quiff");
    expect(colourOf("copper").id).toBe("copper");
  });
});

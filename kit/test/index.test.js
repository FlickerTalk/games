// What a game hands the kit (README, "A game"): `defineGame` refuses an incomplete game before
// anything runs, and registers the component once.
import { describe, expect, it } from "vitest";
import { defineGame } from "../src/index.js";
import { toy } from "./helpers.js";

const complete = { ...toy, tag: "ft-toy-index", app: "1.0.0", board: { mount: () => ({}) }, texts: { en: { name: "Toy" } } };

describe("defineGame", () => {
  it("refuses a game without its rules, its board or its texts", () => {
    for (const field of ["id", "gv", "tag", "app", "icon", "initial", "turn", "play", "result", "board", "texts"]) {
      const broken = { ...complete };
      delete broken[field];
      expect(() => defineGame(broken), field).toThrow(field);
    }
    expect(() => defineGame({ ...complete, board: {} })).toThrow("mount");
  });

  it("registers the game's component once", () => {
    expect(defineGame(complete)).toBe(complete);
    expect(customElements.get("ft-toy-index")).toBeTruthy();
    expect(() => defineGame(complete)).not.toThrow();
  });
});

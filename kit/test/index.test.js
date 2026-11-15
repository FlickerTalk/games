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

  it("takes an optional robot that plays by its own move or by the kit's search, and refuses half of one", () => {
    expect(defineGame({ ...complete, tag: "ft-toy-own", robot: { move: () => "p" } }).robot.move()).toBe("p");
    expect(defineGame({ ...complete, tag: "ft-toy-searched", robot: { moves: () => [], score: () => 0, depth: 3 } }).robot.depth).toBe(3);
    for (const robot of [null, {}, { moves: () => [] }, { score: () => 0 }, { move: "p" }]) {
      expect(() => defineGame({ ...complete, tag: "ft-toy-broken", robot }), JSON.stringify(robot)).toThrow("robot");
    }
    expect(customElements.get("ft-toy-broken")).toBeUndefined();
  });

  it("registers the game's component once", () => {
    expect(defineGame(complete)).toBe(complete);
    expect(customElements.get("ft-toy-index")).toBeTruthy();
    expect(() => defineGame(complete)).not.toThrow();
  });
});

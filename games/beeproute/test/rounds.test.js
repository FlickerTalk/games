import { describe, expect, it } from "vitest";
import { makeLevel } from "../src/level.js";
import { commandsFor, freshRound, hintOf, keptRound, savedRound } from "../src/rounds.js";

const DOOR = makeLevel({ size: 5, start: { at: 22, dir: 0 }, rows: ["..G..", ".....", "..D..", ".....", "....."] });
const PLAIN = makeLevel({ size: 5, start: { at: 22, dir: 0 }, rows: ["..G..", ".....", ".....", ".....", "....."] });

describe("a round", () => {
  it("offers the arrows always, use only where there is a door, and the ring once the player has it", () => {
    expect(commandsFor(freshRound({ kind: "level", level: PLAIN, loops: false }))).toEqual(["L", "F", "R"]);
    expect(commandsFor(freshRound({ kind: "level", level: DOOR, loops: false }))).toEqual(["L", "F", "R", "U"]);
    expect(commandsFor(freshRound({ kind: "level", level: DOOR, loops: true }))).toEqual(["L", "F", "R", "U", "ring"]);
  });

  it("knows the shortest program of its level, for the stars", () => {
    expect(freshRound({ kind: "level", level: PLAIN }).best).toBe(4);
    expect(freshRound({ kind: "level", level: DOOR }).best).toBe(5);
  });

  it("is kept with its program so that the player can come back to it, and read back the same", () => {
    const round = { ...freshRound({ kind: "level", level: DOOR, maker: "flick", loops: true, seed: "AbCdEfGh" }), edit: { items: ["U", { times: 2, body: ["F"] }], open: false }, fails: 2 };
    const back = keptRound(JSON.parse(savedRound(round)));
    expect(back).toMatchObject({ kind: "level", code: round.code, maker: "flick", loops: true, fails: 2, driver: "me" });
    expect(back.edit.items).toEqual(round.edit.items);
    expect(back.level).toEqual(DOOR);
    expect(keptRound({ v: 1, kind: "level", code: "nonsense" })).toBeNull();
    expect(keptRound(null)).toBeNull();
  });

  it("points the teaching hand at the next right command, or at undo when a command must go", () => {
    const fresh = freshRound({ kind: "level", level: PLAIN });
    expect(hintOf(fresh, { taught: false })).toEqual({ kind: "command", value: "F" });
    expect(hintOf(fresh, { taught: true })).toBeNull();
    const stuck = { ...fresh, fails: 2, edit: { items: ["F", "R"], open: false }, wrong: 2 };
    expect(hintOf(stuck, { taught: true })).toEqual({ kind: "command", value: "L" });
    const walled = makeLevel({ size: 5, start: { at: 22, dir: 0 }, rows: ["..G..", ".....", "..#..", ".....", "....."] });
    const bumped = { ...freshRound({ kind: "level", level: walled }), fails: 2, edit: { items: ["F", "F"], open: false }, wrong: 1 };
    expect(hintOf(bumped, { taught: true })).toEqual({ kind: "undo", value: "undo" });
    expect(hintOf({ ...fresh, driver: "flick" }, { taught: false })).toBeNull();
  });
});

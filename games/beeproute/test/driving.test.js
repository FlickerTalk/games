import { describe, expect, it, vi } from "vitest";
import { addCommand, frameRound, pressUndo, robotNow, startScript, toggleRun } from "../src/driving.js";
import { makeLevel } from "../src/level.js";
import { freshRound } from "../src/rounds.js";
import { STEP_MS } from "../src/motion.js";

const LEVEL = makeLevel({ size: 5, start: { at: 22, dir: 0 }, rows: ["..G..", ".....", "..B..", ".....", "....."] });

function fakeGame(round) {
  let clock = 0;
  const game = {
    state: { round, taught: true, moments: [], hint: null, endAt: null, chat: "c" },
    sound: { play: vi.fn() },
    store: { set: vi.fn(async () => true) },
    now: () => clock,
    run: (task) => Promise.resolve().then(task),
    saveOwn: vi.fn(),
  };
  game.tick = (ms) => {
    for (let left = ms; left > 0; left -= 20) {
      clock += 20;
      frameRound(game, clock);
    }
  };
  return game;
}

describe("a run", () => {
  it("lights each step's sparkle and sound as the robot gets there, and asks for the star screen at the goal", () => {
    const game = fakeGame(freshRound({ kind: "level", level: LEVEL }));
    for (const command of ["F", "F", "F", "F"]) addCommand(game, command);
    toggleRun(game);
    game.tick(STEP_MS.move + STEP_MS.battery + 40);
    expect(game.sound.play.mock.calls.map(([name]) => name)).toContain("collect");
    expect(game.state.moments.some((moment) => moment.kind === "burst" && moment.x === 2 && moment.y === 2)).toBe(true);
    game.tick(3000);
    expect(game.state.round.finished).not.toBeNull();
    expect(game.state.endAt).not.toBeNull();
    expect(robotNow(game.state.round, game.now())).toMatchObject({ x: 2, y: 0, pose: "cheer" });
  });

  it("leaves the program alone while the robot runs it", () => {
    const game = fakeGame(freshRound({ kind: "level", level: LEVEL }));
    addCommand(game, "F");
    toggleRun(game);
    addCommand(game, "R");
    pressUndo(game);
    expect(game.state.round.edit.items).toEqual(["F"]);
  });
});

describe("a script", () => {
  it("types for Flick one command at a time, runs, and never lets the player's taps in", () => {
    const game = fakeGame(freshRound({ kind: "flick", level: LEVEL, driver: "flick" }));
    startScript(game, [{ kind: "add", command: "F" }, { kind: "add", command: "F" }, { kind: "add", command: "F" }, { kind: "add", command: "F" }, { kind: "run" }], 0);
    game.tick(100);
    expect(game.state.round.edit.items).toEqual(["F"]);
    addCommand(game, "R");
    expect(game.state.round.edit.items).toEqual(["F"]);
    game.tick(2000);
    expect(game.state.round.edit.items).toEqual(["F", "F", "F", "F"]);
    expect(game.state.round.run ?? game.state.round.finished).not.toBeNull();
    game.tick(5000);
    expect(game.state.round.finished).not.toBeNull();
  });

  it("waits for the robot to come back from a slip before cutting the strip and going on", () => {
    const walled = makeLevel({ size: 5, start: { at: 22, dir: 0 }, rows: ["..G..", "..#..", ".....", ".....", "....."] });
    const game = fakeGame(freshRound({ kind: "flick", level: walled, driver: "flick" }));
    startScript(game, [{ kind: "add", command: "F" }, { kind: "add", command: "F" }, { kind: "add", command: "F" }, { kind: "run" }, { kind: "cut", slot: 2 }, { kind: "add", command: "L" }], 0);
    game.tick(1500 + STEP_MS.move * 2 + STEP_MS.bump);
    expect(game.state.round.wrong).toBe(2);
    expect(game.state.round.fails).toBe(0);
    game.tick(2500);
    expect(game.state.round.edit.items).toEqual(["F", "F", "L"]);
  });
});

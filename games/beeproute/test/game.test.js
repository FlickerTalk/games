import { afterEach, describe, expect, it, vi } from "vitest";
import { makeLevel } from "../src/level.js";
import { BACK_MS } from "../src/rounds.js";
import { slotsOf } from "../src/program.js";
import { shortest } from "../src/solver.js";
import { makeGame, memoryStore, played, solve, tap, targetOf, type } from "./harness.js";

afterEach(() => vi.restoreAllMocks());

const WALL = makeLevel({ size: 5, start: { at: 22, dir: 0 }, rows: ["..G..", ".....", "..#..", ".....", "....."] });

async function onLevel(game, level = WALL) {
  await tap(game, targetOf(game, "play"));
  game.state.round.level = level;
  game.state.round.best = shortest(level).length;
}

describe("opening the game", () => {
  it("shows the home screen and says nothing on the live channel, alone outside a conversation", async () => {
    const { game, core } = await makeGame({ opening: { chat: undefined, live: true } });
    expect(game.state.screen).toBe("home");
    expect(game.state.mode).toBe("alone");
    expect(core.ft.live.send).not.toHaveBeenCalled();
  });

  it("plays against Flick in the FlickerTalk conversation and with the friend in a contact's", async () => {
    expect((await makeGame({ opening: { solo: true } })).game.state.mode).toBe("flick");
    expect((await makeGame({ opening: { live: true } })).game.state.mode).toBe("friend");
  });
});

describe("solving a level", () => {
  it("starts from one big play button on a level made for the player's level, and lays the arrows on the strip", async () => {
    const { game, sound } = await makeGame();
    await tap(game, targetOf(game, "play"));
    expect(game.state.screen).toBe("play");
    expect(game.state.round.level.size).toBe(5);
    expect(sound.music).toHaveBeenLastCalledWith("calm");
    await type(game, ["F", "R", "F"]);
    expect(game.state.round.edit.items).toEqual(["F", "R", "F"]);
    await tap(game, targetOf(game, "undo"));
    expect(game.state.round.edit.items).toEqual(["F", "R"]);
    expect(played(sound).filter((name) => name === "place")).toHaveLength(3);
  });

  it("runs the program step by step and ends on the star screen when the robot reaches the goal", async () => {
    const { game, store, later, sound } = await makeGame();
    await tap(game, targetOf(game, "play"));
    await solve(game, later);
    expect(game.state.screen).toBe("end");
    expect(game.state.outcome.stars).toBe(3);
    expect(game.state.outcome.count).toBe(shortest(game.state.round.level).length);
    expect(JSON.parse(store.kept.get("progress")).level).toBe(2);
    expect(played(sound)).toContain("success");
    await later(60_000, 1000);
    expect(game.state.screen).toBe("end");
    await tap(game, targetOf(game, "again"));
    expect(game.state.screen).toBe("play");
    expect(game.state.round.edit.items).toEqual([]);
  });

  it("never shows a failure: a wrong program stops at the wrong command, the robot shrugs and goes back to the start", async () => {
    const { game, later, sound } = await makeGame();
    await onLevel(game);
    await type(game, ["F", "F", "F", "F"]);
    await tap(game, targetOf(game, "play"));
    await later(3000);
    expect(game.state.screen).toBe("play");
    expect(game.state.round.wrong).toBe(1);
    expect(game.state.round.fails).toBe(1);
    expect(played(sound)).toContain("bounce");
    await later(BACK_MS);
    expect(game.state.round.failed).toBeNull();
    await tap(game, targetOf(game, "undo"));
    expect(game.state.round.edit.items).toEqual(["F"]);
    expect(game.state.round.wrong).toBeNull();
  });

  it("marks the empty slot when the program stops short, and adding a command clears it", async () => {
    const { game, later } = await makeGame();
    await onLevel(game);
    await type(game, ["R"]);
    await tap(game, targetOf(game, "play"));
    await later(2000);
    expect(game.state.round.wrong).toBe(1);
    await type(game, ["F"]);
    expect(game.state.round.wrong).toBeNull();
  });

  it("stops a run with the same button that started it", async () => {
    const { game } = await makeGame();
    await onLevel(game);
    await type(game, ["F", "F"]);
    await tap(game, targetOf(game, "play"));
    expect(game.state.round.run).not.toBeNull();
    await tap(game, targetOf(game, "play"));
    expect(game.state.round.run).toBeNull();
    expect(game.state.round.edit.items).toEqual(["F", "F"]);
  });

  it("shows the teaching hand on the first level until the first arrow is laid, and points the way after two wrong runs", async () => {
    const store = memoryStore();
    const { game, later } = await makeGame({ store });
    await tap(game, targetOf(game, "play"));
    expect(game.state.hint).toMatchObject({ kind: "command" });
    await type(game, [game.state.hint.value]);
    expect(game.state.hint).toBeNull();
    const again = await makeGame({ store });
    await onLevel(again.game);
    expect(again.game.state.hint).toBeNull();
    for (let run = 0; run < 2; run += 1) {
      await type(again.game, ["F", "F"]);
      await tap(again.game, targetOf(again.game, "play"));
      await again.later(3000);
      await tap(again.game, targetOf(again.game, "undo"));
    }
    expect(again.game.state.hint).toMatchObject({ kind: "command" });
  });

  it("keeps the level the player leaves through the pause, program and all", async () => {
    const { game } = await makeGame();
    await tap(game, targetOf(game, "play"));
    const code = game.state.round.code;
    await type(game, ["F", "L"]);
    await tap(game, targetOf(game, "pause"));
    expect(game.state.paused).toBe(true);
    await tap(game, targetOf(game, "home"));
    expect(game.state.screen).toBe("home");
    await tap(game, targetOf(game, "play"));
    expect(game.state.round.code).toBe(code);
    expect(game.state.round.edit.items).toEqual(["F", "L"]);
  });

  it("holds no more commands than the strip has slots", async () => {
    const { game } = await makeGame();
    await tap(game, targetOf(game, "play"));
    for (let at = 0; at < 25; at += 1) await tap(game, targetOf(game, "command", "L"));
    expect(slotsOf(game.state.round.edit.items)).toBe(20);
  });
});

describe("against Flick", () => {
  it("solves Flick's levels without ever touching the live channel", async () => {
    const { game, core, later } = await makeGame({ opening: { solo: true } });
    await tap(game, targetOf(game, "play"));
    expect(game.state.round.maker).toBe("flick");
    await solve(game, later);
    expect(game.state.screen).toBe("end");
    expect(core.ft.live.send).not.toHaveBeenCalled();
  }, 60_000);

  it("lets the player make a level that Flick then solves on the phone, step by step at a pace one can follow", async () => {
    const { game, core, later } = await makeGame({ opening: { solo: true } });
    await tap(game, targetOf(game, "variant", "make"));
    await tap(game, targetOf(game, "play"));
    expect(game.state.screen).toBe("build");
    await tap(game, targetOf(game, "tool", "wall"));
    await tap(game, targetOf(game, "cell", 14));
    expect(game.state.build.level.cells[14]).toBe("#");
    await tap(game, targetOf(game, "send"));
    expect(game.state.screen).toBe("play");
    expect(game.state.round).toMatchObject({ kind: "flick", driver: "flick" });
    await later(400);
    expect(game.state.round.edit.items).toEqual([]);
    await later(1500);
    expect(slotsOf(game.state.round.edit.items)).toBeGreaterThan(0);
    await type(game, ["F"]);
    await later(60_000, 100);
    expect(game.state.screen).toBe("end");
    expect(game.state.outcome).toMatchObject({ kind: "flick", stars: 3 });
    expect(core.ft.live.send).not.toHaveBeenCalled();
  }, 60_000);

  it("refuses to send a level the robot cannot finish, with a shake instead of words", async () => {
    const { game, sound } = await makeGame({ opening: { solo: true } });
    await tap(game, targetOf(game, "variant", "make"));
    await tap(game, targetOf(game, "play"));
    await tap(game, targetOf(game, "tool", "wall"));
    for (const at of [6, 7, 8, 9, 10, 11]) await tap(game, targetOf(game, "cell", at));
    await tap(game, targetOf(game, "send"));
    expect(game.state.screen).toBe("build");
    expect(game.state.moments.some((moment) => moment.kind === "shake")).toBe(true);
    expect(played(sound)).toContain("error-soft");
  });
});

describe("the sound controls", () => {
  it("unfold the volume line from the speaker and switch the music", async () => {
    const { game, sound } = await makeGame();
    await tap(game, targetOf(game, "play"));
    await tap(game, targetOf(game, "speaker"));
    expect(game.state.sound.open).toBe(true);
    const line = targetOf(game, "volume");
    game.pointer({ type: "down", x: line.x + 24, y: line.y + line.h / 2 });
    game.pointer({ type: "up", x: line.x + 24, y: line.y + line.h / 2 });
    expect(sound.set).toHaveBeenLastCalledWith({ volume: 0 });
    await tap(game, targetOf(game, "music"));
    expect(sound.set).toHaveBeenLastCalledWith({ music: false });
  });
});

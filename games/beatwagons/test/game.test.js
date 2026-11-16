import { afterEach, describe, expect, it, vi } from "vitest";
import { INSTRUMENTS } from "../src/tune.js";
import { checkTrain, kindOf } from "../src/train.js";
import { completeRound, completeTrain, makeGame, memoryStore, played, rightIndex, tap, targetOf, until, wrongIndex } from "./harness.js";

afterEach(() => vi.restoreAllMocks());

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

describe("completing trains", () => {
  it("starts from one big play button: a train of the player's level rolls in and stops, a wagon missing", async () => {
    const made = await makeGame();
    const { game, sound } = made;
    await tap(game, targetOf(game, "play"));
    expect(game.state.screen).toBe("play");
    expect(game.state.round).toMatchObject({ kind: "level", phase: "arrive", at: 0 });
    expect(game.state.round.trains).toHaveLength(3);
    for (const train of game.state.round.trains) expect(checkTrain(train)).toBeNull();
    expect(game.state.round.trains[0].wagons).toHaveLength(4);
    expect(sound.music).toHaveBeenLastCalledWith("calm");
    await tap(game, targetOf(game, "candidate", 0));
    expect(game.state.round.flying).toBeNull();
    await until(made, (state) => state.round.phase === "solve");
    expect(targetOf(game, "candidate", 2)).toBeDefined();
  });

  it("couples the right wagon with its note, then plays the whole train as a tune and lets it roll away", async () => {
    const made = await makeGame();
    const { game, sound } = made;
    await tap(game, targetOf(game, "play"));
    await until(made, (state) => state.round.phase === "solve");
    const wagons = game.state.round.trains[0].wagons;
    await tap(game, targetOf(game, "candidate", rightIndex(game.state.round)));
    expect(game.state.round.flying).not.toBeNull();
    await until(made, (state) => state.round.phase === "tune");
    expect(game.state.moments.some((moment) => moment.kind === "burst")).toBe(true);
    sound.play.mockClear();
    await until(made, (state) => state.round.phase === "leave");
    expect(played(sound).filter((name) => INSTRUMENTS.includes(name))).toEqual(wagons.map((wagon) => INSTRUMENTS[kindOf(wagon)]));
    await until(made, (state) => state.round.at === 1);
    expect(game.state.round.phase).toBe("arrive");
    expect(game.state.screen).toBe("play");
  });

  it("never shows a failure: a wagon that does not fit sounds off, wobbles and rolls back to the siding", async () => {
    const made = await makeGame();
    const { game, sound } = made;
    await tap(game, targetOf(game, "play"));
    await until(made, (state) => state.round.phase === "solve");
    await tap(game, targetOf(game, "candidate", wrongIndex(game.state.round)));
    await until(made, (state) => Boolean(state.round.back));
    expect(played(sound)).toContain("error-soft");
    expect(game.state.round.wrongs).toBe(1);
    await tap(game, targetOf(game, "candidate", rightIndex(game.state.round)));
    expect(game.state.round.flying).toBeNull();
    await until(made, (state) => !state.round.back);
    expect(game.state.screen).toBe("play");
    expect(game.state.round.phase).toBe("solve");
    await completeTrain(made);
    expect(game.state.round.phase).toBe("tune");
  });

  it("ends a round of three trains on the star screen, moves up a level, and waits there for the player", async () => {
    const made = await makeGame();
    const { game, store } = made;
    await tap(game, targetOf(game, "play"));
    await completeRound(made);
    expect(game.state.screen).toBe("end");
    expect(game.state.outcome).toMatchObject({ kind: "level", stars: 3, level: 1 });
    expect(JSON.parse(store.kept.get("progress")).level).toBe(2);
    await made.later(60_000, 1000);
    expect(game.state.screen).toBe("end");
    await tap(game, targetOf(game, "again"));
    expect(game.state.screen).toBe("play");
    expect(game.state.round.at).toBe(0);
  }, 60_000);

  it("gives fewer stars for wrong wagons, never none", async () => {
    const made = await makeGame();
    const { game } = made;
    await tap(game, targetOf(game, "play"));
    await until(made, (state) => state.round.phase === "solve");
    for (let wrong = 0; wrong < 3; wrong += 1) {
      await tap(game, targetOf(game, "candidate", wrongIndex(game.state.round)));
      await until(made, (state) => Boolean(state.round.back));
      await until(made, (state) => !state.round.back);
    }
    await completeRound(made);
    expect(game.state.outcome.stars).toBe(1);
  }, 60_000);

  it("shows the teaching hand until the first wagon is placed, and points at the right wagon after two wrong ones", async () => {
    const store = memoryStore();
    const first = await makeGame({ store });
    await tap(first.game, targetOf(first.game, "play"));
    await until(first, (state) => state.round.phase === "solve");
    expect(first.game.state.hint).toMatchObject({ candidate: rightIndex(first.game.state.round), shape: false });
    await tap(first.game, targetOf(first.game, "candidate", rightIndex(first.game.state.round)));
    expect(first.game.state.hint).toBeNull();
    const again = await makeGame({ store, seed: 11 });
    await tap(again.game, targetOf(again.game, "play"));
    await until(again, (state) => state.round.phase === "solve");
    expect(again.game.state.hint).toBeNull();
    for (let wrong = 0; wrong < 2; wrong += 1) {
      await tap(again.game, targetOf(again.game, "candidate", wrongIndex(again.game.state.round)));
      await until(again, (state) => Boolean(state.round.back));
      await until(again, (state) => !state.round.back);
    }
    expect(again.game.state.hint).toMatchObject({ shape: true });
  });

  it("keeps the round the player leaves through the pause, on the train it was left on", async () => {
    const made = await makeGame();
    const { game } = made;
    await tap(game, targetOf(game, "play"));
    await completeTrain(made);
    await until(made, (state) => state.round.at === 1);
    const trains = game.state.round.trains;
    await tap(game, targetOf(game, "pause"));
    expect(game.state.paused).toBe(true);
    await tap(game, targetOf(game, "home"));
    expect(game.state.screen).toBe("home");
    await tap(game, targetOf(game, "play"));
    expect(game.state.round.trains).toEqual(trains);
    expect(game.state.round.at).toBe(1);
  });
});

describe("against Flick", () => {
  it("completes a whole round of Flick's trains without ever touching the live channel", async () => {
    const made = await makeGame({ opening: { solo: true } });
    const { game, core } = made;
    await tap(game, targetOf(game, "play"));
    expect(game.state.round.maker).toBe("flick");
    await completeRound(made);
    expect(game.state.screen).toBe("end");
    expect(core.ft.live.send).not.toHaveBeenCalled();
  }, 60_000);

  it("lets the player compose a train that Flick then completes on the phone, wagon by wagon at a pace one can follow", async () => {
    const made = await makeGame({ opening: { solo: true } });
    const { game, core, later } = made;
    await tap(game, targetOf(game, "variant", "make"));
    await tap(game, targetOf(game, "play"));
    expect(game.state.screen).toBe("build");
    for (const kind of [0, 1, 0, 1]) await tap(game, targetOf(game, "wagon", kind));
    await tap(game, targetOf(game, "slot", 3));
    expect(game.state.build.check.ok).toBe(true);
    await tap(game, targetOf(game, "send"));
    expect(game.state.screen).toBe("play");
    expect(game.state.round).toMatchObject({ kind: "flick", driver: "flick" });
    await later(1500);
    expect(game.state.round.puzzle.tries).toEqual([]);
    await tap(game, targetOf(game, "candidate", 0));
    expect(game.state.round.flying).toBeNull();
    await until(made, (state) => state.screen === "end", 60_000);
    expect(game.state.outcome).toMatchObject({ kind: "flick" });
    expect(game.state.outcome.stars).toBeGreaterThanOrEqual(2);
    expect(core.ft.live.send).not.toHaveBeenCalled();
  }, 60_000);

  it("refuses to hand over a train with no gap, or with more than one right answer, with a shake instead of words", async () => {
    const { game, sound } = await makeGame({ opening: { solo: true } });
    await tap(game, targetOf(game, "variant", "make"));
    await tap(game, targetOf(game, "play"));
    for (const kind of [0, 1, 0, 1]) await tap(game, targetOf(game, "wagon", kind));
    await tap(game, targetOf(game, "send"));
    expect(game.state.screen).toBe("build");
    expect(game.state.moments.some((moment) => moment.kind === "shake")).toBe(true);
    expect(played(sound)).toContain("error-soft");
  });
});

describe("composing alone", () => {
  it("plays each wagon as it is coupled and the whole train as a tune, with no train to send and no end screen", async () => {
    const made = await makeGame();
    const { game, sound, later } = made;
    await tap(game, targetOf(game, "variant", "make"));
    await tap(game, targetOf(game, "play"));
    expect(targetOf(game, "slot")).toBeUndefined();
    await tap(game, targetOf(game, "dots"));
    for (const kind of [2, 5, 2]) await tap(game, targetOf(game, "wagon", kind));
    expect(played(sound).filter((name) => INSTRUMENTS.includes(name))).toEqual(["whistle", "whistle", "clapper", "clapper", "whistle", "whistle"]);
    await tap(game, targetOf(game, "undo"));
    expect(game.state.build.wagons).toHaveLength(2);
    sound.play.mockClear();
    await tap(game, targetOf(game, "send"));
    expect(game.state.build.tune).not.toBeNull();
    await later(3000);
    expect(played(sound).filter((name) => INSTRUMENTS.includes(name))).toEqual(["whistle", "whistle", "clapper", "clapper"]);
    expect(game.state.build.tune).toBeNull();
    expect(game.state.screen).toBe("build");
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

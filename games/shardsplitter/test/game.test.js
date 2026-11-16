import { afterEach, describe, expect, it, vi } from "vitest";
import { FLICK_PACE } from "../src/flick.js";
import { HANDS, TEAM_HANDS } from "../src/levels.js";
import { IMPACT_MS } from "../src/motion.js";
import { finishRound, fitting, hitRight, makeGame, memoryStore, myTurn, played, settled, tap, targetOf, unfitting } from "./harness.js";

afterEach(() => vi.restoreAllMocks());

describe("opening the game", () => {
  it("shows the home screen and says nothing on the live channel, alone outside a conversation", async () => {
    const { game, core } = await makeGame({ opening: { chat: undefined, live: true } });
    expect(game.state.screen).toBe("home");
    expect(game.state.mode).toBe("alone");
    expect(core.ft.live.send).not.toHaveBeenCalled();
  });

  it("plays with Flick in the FlickerTalk conversation and with the friend in a contact's", async () => {
    expect((await makeGame({ opening: { solo: true } })).game.state.mode).toBe("flick");
    expect((await makeGame({ opening: { live: true } })).game.state.mode).toBe("friend");
  });
});

describe("splitting golems alone", () => {
  it("starts from one big play button with 2, 5 and 10 in hand, and a hit that divides splits the golem at once", async () => {
    const { game, sound, later } = await makeGame();
    await tap(game, targetOf(game, "play"));
    expect(game.state.screen).toBe("play");
    expect(game.targets().filter((one) => one.kind === "hit").map((one) => one.value)).toEqual(HANDS[0]);
    expect(sound.music).toHaveBeenLastCalledWith("playful");
    const { value } = game.state.round.core;
    const divisor = fitting(game)[0];
    await hitRight(game, later);
    const { round } = game.state;
    expect(round.hits).toEqual([divisor]);
    expect(round.swings[0]).toMatchObject({ miss: false });
    expect(round.split ?? round.leave).not.toBeNull();
    expect(round.core.at === 1 || round.core.value === value / divisor).toBe(true);
    expect(played(sound)).toContain("pop");
  });

  it("never shows a failure: a divisor that does not divide clinks off and the golem sticks its tongue out", async () => {
    const { game, sound, later } = await makeGame();
    await tap(game, targetOf(game, "play"));
    await settled(game, later);
    const before = { ...game.state.round.core };
    await tap(game, targetOf(game, "hit", unfitting(game)[0]));
    const { round } = game.state;
    expect(game.state.screen).toBe("play");
    expect(round.core).toMatchObject({ value: before.value, count: before.count, clinks: [1] });
    expect(round.swings[0]).toMatchObject({ miss: true });
    expect(round.tongueUntil).toBeGreaterThan(game.now());
    expect(round.bell.start).toBe(game.now() + IMPACT_MS);
    expect(played(sound)).toContain("clink");
    expect(played(sound)).not.toContain("lose-soft");
  });

  it("takes one hit at a time: a second tap while the mallet is still swinging does nothing", async () => {
    const { game, later } = await makeGame();
    await tap(game, targetOf(game, "play"));
    await settled(game, later);
    const button = targetOf(game, "hit", unfitting(game)[0]);
    await tap(game, button);
    await tap(game, button);
    expect(game.state.round.core.clinks).toEqual([1]);
  });

  it("ends the round on the star screen with three stars when nothing clinked, moves up a level and never starts again by itself", async () => {
    const { game, store, later, sound } = await makeGame();
    await tap(game, targetOf(game, "play"));
    const golems = game.state.round.core.golems.length;
    await finishRound(game, later);
    expect(game.state.screen).toBe("end");
    expect(game.state.outcome).toMatchObject({ stars: 3, score: 100, golems });
    expect(JSON.parse(store.kept.get("progress")).level).toBe(2);
    expect(store.kept.get(`round/${game.state.chat}`)).toBe("null");
    expect(played(sound)).toContain("win");
    await later(60_000, 1000);
    expect(game.state.screen).toBe("end");
    await tap(game, targetOf(game, "again"));
    expect(game.state.screen).toBe("play");
    expect(game.state.round.hits).toEqual([]);
  }, 60_000);

  it("gives fewer stars for a round with clinks, and still lets the player through", async () => {
    const { game, later } = await makeGame();
    await tap(game, targetOf(game, "play"));
    await settled(game, later);
    await tap(game, targetOf(game, "hit", unfitting(game)[0]));
    await finishRound(game, later);
    expect(game.state.outcome).toMatchObject({ stars: 2, score: 85 });
    expect(game.state.progress.level).toBe(2);
  }, 60_000);

  it("shows the teaching hand on a divisor that fits until the first hit, then leaves the player alone", async () => {
    const store = memoryStore();
    const { game, later } = await makeGame({ store });
    await tap(game, targetOf(game, "play"));
    expect(fitting(game)).toContain(game.state.hint.divisor);
    await hitRight(game, later);
    expect(game.state.hint).toBeNull();
    expect(JSON.parse(store.kept.get("shardsplitter")).taught).toBe(true);
    const again = await makeGame({ store: memoryStore({ shardsplitter: store.kept.get("shardsplitter") }) });
    await tap(again.game, targetOf(again.game, "play"));
    expect(again.game.state.hint).toBeNull();
  });

  it("keeps the round the player leaves through the pause, hits and all", async () => {
    const { game, later } = await makeGame();
    await tap(game, targetOf(game, "play"));
    await hitRight(game, later);
    await hitRight(game, later);
    const { code, hits } = game.state.round;
    await later(3000);
    await tap(game, targetOf(game, "pause"));
    expect(game.state.paused).toBe(true);
    expect(game.resting()).toBe(true);
    await tap(game, targetOf(game, "home"));
    expect(game.state.screen).toBe("home");
    await tap(game, targetOf(game, "play"));
    expect(game.state.round.code).toBe(code);
    expect(game.state.round.hits).toEqual(hits);
  });
});

describe("with Flick as the teammate", () => {
  it("deals the player one hand and Flick the other, and Flick hits on its turn at a pace one can follow", async () => {
    const { game, later } = await makeGame({ opening: { solo: true } });
    await tap(game, targetOf(game, "play"));
    const { round } = game.state;
    expect(round.kind).toBe("flick");
    expect(round.core.hands).toEqual(TEAM_HANDS[0]);
    expect(game.targets().filter((one) => one.kind === "hit").map((one) => one.value)).toEqual(TEAM_HANDS[0][0]);
    if (myTurn(game)) await hitRight(game, later);
    await settled(game, later);
    if (myTurn(game)) return;
    const hits = game.state.round.hits.length;
    await later(FLICK_PACE - 200);
    expect(game.state.round.hits).toHaveLength(hits);
    await later(400);
    expect(game.state.round.hits).toHaveLength(hits + 1);
    expect(game.state.round.swings[1]).toMatchObject({ miss: false });
  });

  it("does not let the player hit on Flick's turn", async () => {
    const { game, later } = await makeGame({ opening: { solo: true } });
    await tap(game, targetOf(game, "play"));
    for (let turn = 0; turn < 20 && myTurn(game); turn += 1) await hitRight(game, later);
    await settled(game, later);
    const hits = game.state.round.hits.length;
    await tap(game, targetOf(game, "hit", game.state.round.core.hands[0][0]));
    expect(game.state.round.hits).toHaveLength(hits);
  });

  it("plays a whole round as a team without ever touching the live channel, and both hands were needed", async () => {
    const { game, core, later } = await makeGame({ opening: { solo: true } });
    await tap(game, targetOf(game, "play"));
    const hands = game.state.round.core.hands;
    await finishRound(game, later);
    expect(game.state.screen).toBe("end");
    expect(game.state.outcome).toMatchObject({ stars: 3, team: true });
    const { hits } = game.state.round;
    expect(hits.some((divisor) => hands[0].includes(divisor))).toBe(true);
    expect(hits.some((divisor) => hands[1].includes(divisor))).toBe(true);
    expect(core.ft.live.send).not.toHaveBeenCalled();
    expect(game.state.progress.level).toBe(2);
  }, 60_000);
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

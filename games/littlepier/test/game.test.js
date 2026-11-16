import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { catchOne, hold, hookY, letGo, makeGame, meetingAt, memoryStore, oneFish, playOut, tap, targetOf } from "./harness.js";

const played = (sound) => sound.play.mock.calls.map(([name]) => name);
const own = (store) => JSON.parse(store.kept.get("littlepier"));

beforeEach(() => vi.useRealTimers());
afterEach(() => vi.restoreAllMocks());

describe("opening the game", () => {
  it("shows the home screen, says nothing on the live channel, and fishes alone without a conversation", async () => {
    const { game, core } = await makeGame({ opening: { chat: undefined, live: true } });
    expect(game.state.screen).toBe("home");
    expect(game.state.mode).toBe("alone");
    expect(core.ft.live.send).not.toHaveBeenCalled();
  });

  it("fishes with Flick in the FlickerTalk conversation and with the friend in a contact's", async () => {
    expect((await makeGame({ opening: { solo: true } })).game.state.mode).toBe("flick");
    expect((await makeGame({ opening: { live: true } })).game.state.mode).toBe("friend");
  });

  it("opens the sticker album from home, and comes back", async () => {
    const store = memoryStore({ littlepier: JSON.stringify({ taught: true, album: [0, 6, 99, "x"], rounds: 2 }) });
    const { game } = await makeGame({ store });
    expect(game.state.album).toEqual([0, 6]);
    await tap(game, targetOf(game, "variant", "album"));
    expect(game.state.screen).toBe("album");
    await tap(game, targetOf(game, "done"));
    expect(game.state.screen).toBe("home");
  });
});

describe("a round", () => {
  it("starts with one big play button, a calm tune and the sea, at the first level's 35 seconds", async () => {
    const { game, sound } = await makeGame();
    await tap(game, targetOf(game, "play"));
    expect(game.state.screen).toBe("play");
    expect(sound.music).toHaveBeenLastCalledWith("calm");
    expect(sound.drone).toHaveBeenLastCalledWith("sea", expect.objectContaining({ level: expect.any(Number) }));
    expect(game.state.round.seconds).toBe(35);
    expect(game.state.round.hooks).toHaveLength(1);
  });

  it("lowers the hook while the water is held and brings it up when it is let go", async () => {
    const { game, later } = await makeGame();
    await tap(game, targetOf(game, "play"));
    game.state.round = { ...game.state.round, visitors: [] };
    const surface = hookY(game);
    hold(game);
    await later(1000);
    expect(hookY(game)).toBeGreaterThan(surface + 100);
    letGo(game);
    await later(2000);
    expect(hookY(game)).toBe(surface);
  });

  it("lands what bit with a happy jump, counts it, and puts a new creature in the album", async () => {
    const { game, store, sound, later } = await makeGame();
    await tap(game, targetOf(game, "play"));
    await catchOne(game, later, { kind: 6, depth: 0.3 });
    expect(game.state.round.caught[0]).toEqual([0]);
    expect(played(sound)).toEqual(expect.arrayContaining(["pop", "collect", "star"]));
    expect(game.state.album).toEqual([6]);
    expect(own(store).album).toEqual([6]);
    const kinds = game.state.moments.map((moment) => moment.kind);
    for (const kind of ["jump", "stars", "sticker", "release"]) expect(kinds, kind).toContain(kind);
  });

  it("lets a fish held on too long swim away smiling, and the player just tries again", async () => {
    const { game, later } = await makeGame();
    await tap(game, targetOf(game, "play"));
    oneFish(game, { kind: 1, depth: 0.2, enter: meetingAt(game.state.round, 0.2) });
    hold(game);
    await later(4000);
    expect(game.state.round.fled.map((one) => one.id)).toEqual([0]);
    expect(game.state.round.caught[0]).toEqual([]);
    expect(game.state.moments.some((moment) => moment.kind === "laugh")).toBe(true);
  });

  it("shows the teaching hand on the very first round until the water is first held, and never again", async () => {
    const store = memoryStore();
    const { game } = await makeGame({ store });
    await tap(game, targetOf(game, "play"));
    expect(game.state.hint).toBe(true);
    hold(game);
    expect(game.state.hint).toBe(false);
    letGo(game);
    await game.idle();
    const again = await makeGame({ store });
    await tap(again.game, targetOf(again.game, "play"));
    expect(again.game.state.hint).toBe(false);
  });

  it("ends on the star screen with the catch and the best mark, and nothing starts by itself", async () => {
    const { game, store, later } = await makeGame();
    await tap(game, targetOf(game, "play"));
    await catchOne(game, later, { kind: 2 });
    await playOut(game, later);
    expect(game.state.screen).toBe("end");
    const { outcome } = game.state;
    expect(outcome).toMatchObject({ score: 1, stars: 1, best: 1 });
    expect(JSON.parse(store.kept.get("progress")).best).toBe(1);
    await later(60_000);
    expect(game.state.screen).toBe("end");
    await tap(game, targetOf(game, "again"));
    expect(game.state.screen).toBe("play");
    expect(game.state.round.caught).toEqual([[]]);
    expect(game.state.day).toBe("sunset");
  }, 60_000);

  it("keeps a round the player leaves through the pause, and goes on with it", async () => {
    const { game, later } = await makeGame();
    await tap(game, targetOf(game, "play"));
    await later(3000);
    await tap(game, targetOf(game, "pause"));
    expect(game.state.paused).toBe(true);
    const time = game.state.round.time;
    await later(5000);
    expect(game.state.round.time).toBe(time);
    await tap(game, targetOf(game, "home"));
    expect(game.state.screen).toBe("home");
    await tap(game, targetOf(game, "play"));
    expect(game.state.round.time).toBeCloseTo(time, 1);
  });

  it("casts by itself when the water's button is pressed, for the keyboard and screen readers", async () => {
    const { game, later } = await makeGame();
    await tap(game, targetOf(game, "play"));
    game.state.round = { ...game.state.round, visitors: [] };
    const surface = hookY(game);
    game.press(targetOf(game, "water"));
    await later(700);
    expect(hookY(game)).toBeGreaterThan(surface + 50);
    await later(4000);
    expect(hookY(game)).toBe(surface);
  });
});

describe("fishing with Flick", () => {
  it("never calls the live channel, and both fill the same bucket and album", async () => {
    const { game, core, store, later } = await makeGame({ opening: { solo: true } });
    await tap(game, targetOf(game, "play"));
    expect(game.state.round.hooks).toHaveLength(2);
    await playOut(game, later);
    const { outcome, round } = game.state;
    expect(round.caught[1].length).toBeGreaterThan(0);
    expect(outcome.score).toBe(round.caught[0].length + round.caught[1].length);
    expect(outcome.flick).toBe(round.caught[1].length);
    expect(own(store).album.length).toBeGreaterThan(0);
    expect(core.ft.live.send).not.toHaveBeenCalled();
  }, 60_000);
});

describe("the sound controls", () => {
  it("unfold the volume line from the speaker, follow the finger along it, and switch the music", async () => {
    const { game, sound } = await makeGame();
    await tap(game, targetOf(game, "play"));
    await tap(game, targetOf(game, "speaker"));
    expect(game.state.sound.open).toBe(true);
    const line = targetOf(game, "volume");
    game.pointer({ type: "down", x: line.x + 24, y: line.y + line.h / 2, id: 1 });
    game.pointer({ type: "up", x: line.x + 24, y: line.y + line.h / 2, id: 1 });
    expect(sound.set).toHaveBeenLastCalledWith({ volume: 0 });
    expect(game.state.sound.level).toBe("mute");
    await tap(game, targetOf(game, "music"));
    expect(sound.set).toHaveBeenLastCalledWith({ music: false });
  });
});

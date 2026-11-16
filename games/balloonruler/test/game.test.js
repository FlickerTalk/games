import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STAGES } from "../src/numbers.js";
import { FLIGHT, REVEAL, scoreIn } from "../src/round.js";
import { makeGame, memoryStore, playOut, shootAt, tap, targetOf, touchRuler, truth, wholeShot } from "./harness.js";

const played = (sound) => sound.play.mock.calls.map(([name]) => name);
const own = (store) => JSON.parse(store.kept.get("balloonruler"));
const far = (share) => (share > 0.5 ? 0.02 : 0.98);

async function playing(options) {
  const made = await makeGame(options);
  await tap(made.game, targetOf(made.game, "play"));
  return made;
}

beforeEach(() => vi.useRealTimers());
afterEach(() => vi.restoreAllMocks());

describe("opening the game", () => {
  it("shows the home screen, says nothing on the live channel, and plays alone without a conversation", async () => {
    const { game, core } = await makeGame({ opening: { chat: undefined, live: true } });
    expect(game.state.screen).toBe("home");
    expect(game.state.mode).toBe("alone");
    expect(core.ft.live.send).not.toHaveBeenCalled();
  });

  it("plays with Flick in the FlickerTalk conversation and with the friend in a contact's", async () => {
    expect((await makeGame({ opening: { solo: true } })).game.state.mode).toBe("flick");
    expect((await makeGame({ opening: { live: true } })).game.state.mode).toBe("friend");
  });

  it("offers three rulers on the home screen, keeps the one chosen and plays on it", async () => {
    const store = memoryStore();
    const { game } = await makeGame({ store });
    expect(game.state.ruler).toBe("short");
    await tap(game, targetOf(game, "variant", "long"));
    expect(game.state.ruler).toBe("long");
    expect(own(store).ruler).toBe("long");
    await tap(game, targetOf(game, "play"));
    expect(STAGES[game.state.round.setup.stage].card).toBe("fraction");
    const again = await makeGame({ store });
    expect(again.game.state.ruler).toBe("long");
  });
});

describe("a round", () => {
  it("starts from one big play button with the playful tune, dots on a ruler from 0 to 10 and the first level's 35 seconds", async () => {
    const { game, sound } = await playing();
    expect(game.state.screen).toBe("play");
    expect(sound.music).toHaveBeenLastCalledWith("playful");
    expect(game.state.round.seconds).toBe(35);
    expect(STAGES[game.state.round.setup.stage]).toMatchObject({ range: 10, card: "dots" });
  });

  it("aims while the finger is on the ruler, follows it, and lets the arrow go where the finger leaves", async () => {
    const { game, sound, later } = await playing();
    const place = truth(game);
    touchRuler(game, 0.1, "down");
    expect(game.state.aim).not.toBeNull();
    expect(game.state.round.shot).toBeNull();
    touchRuler(game, place, "move");
    touchRuler(game, place, "up");
    expect(game.state.aim).toBeNull();
    expect(game.state.round.shot.guess).toBeCloseTo(place, 3);
    expect(played(sound)).toContain("whoosh");
    await later(FLIGHT * 1000 + 50);
    expect(game.state.round.guesses).toHaveLength(1);
    expect(game.state.last).toMatchObject({ index: 0, stars: 3, real: true });
    expect(played(sound)).toEqual(expect.arrayContaining(["pop", "collect"]));
    expect(scoreIn(game.state.round)).toBeGreaterThanOrEqual(3);
    await later(REVEAL * 1000 + 50);
    expect(game.state.last).toBeNull();
    expect(game.state.round.shot).toBeNull();
  });

  it("ignores the ruler while an arrow is in the air", async () => {
    const { game, later } = await playing();
    shootAt(game, 0.3);
    shootAt(game, 0.9);
    await later(wholeShot);
    expect(game.state.round.guesses).toHaveLength(1);
    expect(game.state.round.guesses[0]).toBeCloseTo(0.3, 3);
  });

  it("counts a far guess too and goes on: no failure, and more marks on the ruler after three in a row", async () => {
    const { game, later } = await playing();
    for (let shot = 0; shot < 3; shot += 1) {
      shootAt(game, far(truth(game)));
      await later(FLIGHT * 1000 + 50);
      expect(game.state.last.stars).toBe(1);
      await later(REVEAL * 1000 + 50);
    }
    expect(game.state.screen).toBe("play");
    expect(scoreIn(game.state.round)).toBe(3);
    expect(game.state.round.ticks).toBe(true);
  });

  it("shows the teaching hand on the very first round until the ruler is first touched, and never again", async () => {
    const store = memoryStore();
    const { game } = await playing({ store });
    expect(game.state.hint).toBe(true);
    shootAt(game, 0.5);
    expect(game.state.hint).toBe(false);
    await game.idle();
    const again = await playing({ store });
    expect(again.game.state.hint).toBe(false);
  });

  it("ends on the star screen with the score and the best mark, and nothing starts by itself", async () => {
    const { game, store, later } = await playing();
    await playOut(game, later);
    expect(game.state.screen).toBe("end");
    const { outcome } = game.state;
    expect(outcome.score).toBeGreaterThanOrEqual(28);
    expect(outcome).toMatchObject({ stars: 3, best: outcome.score, flick: null });
    expect(JSON.parse(store.kept.get("progress"))).toMatchObject({ best: outcome.score, level: 2 });
    await later(60_000);
    expect(game.state.screen).toBe("end");
    await tap(game, targetOf(game, "again"));
    expect(game.state.screen).toBe("play");
    expect(game.state.round.guesses).toEqual([]);
  }, 60_000);

  it("keeps a round the player leaves through the pause, and goes on with it", async () => {
    const { game, later } = await playing();
    shootAt(game, truth(game));
    await later(wholeShot);
    await tap(game, targetOf(game, "pause"));
    expect(game.state.paused).toBe(true);
    const time = game.state.round.time;
    await later(5000);
    expect(game.state.round.time).toBe(time);
    await tap(game, targetOf(game, "home"));
    expect(game.state.screen).toBe("home");
    await tap(game, targetOf(game, "play"));
    expect(game.state.round.time).toBeCloseTo(time, 1);
    expect(game.state.round.guesses).toHaveLength(1);
  });

  it("starts afresh on another ruler instead of going on with the round that was left", async () => {
    const { game, later } = await playing();
    shootAt(game, 0.5);
    await later(wholeShot);
    await tap(game, targetOf(game, "pause"));
    await tap(game, targetOf(game, "home"));
    await tap(game, targetOf(game, "variant", "medium"));
    await tap(game, targetOf(game, "play"));
    expect(game.state.round.guesses).toEqual([]);
    expect(STAGES[game.state.round.setup.stage].range).toBe(100);
  });

  it("shoots at the middle of a part of the ruler when its button is pressed, for the keyboard and screen readers", async () => {
    const { game, later } = await playing();
    const part = targetOf(game, "ruler", 1);
    game.press(part);
    await later(FLIGHT * 1000 + 50);
    expect(game.state.round.guesses).toHaveLength(1);
    const middle = (part.x + part.w / 2 - game.state.layout.ruler.x - 8) / (game.state.layout.ruler.w - 16);
    expect(game.state.round.guesses[0]).toBeCloseTo(middle, 2);
  });
});

describe("playing with Flick", () => {
  it("never calls the live channel; Flick answers every number after the player, with a score of its own that can be beaten", async () => {
    const { game, core, later } = await playing({ opening: { solo: true } });
    expect(game.state.round.rival).toBe(true);
    shootAt(game, truth(game));
    await later(FLIGHT * 1000 + 50);
    expect(game.state.last.flick).toBeGreaterThanOrEqual(0);
    expect(game.state.last.flick).toBeLessThanOrEqual(1);
    await playOut(game, later);
    const { outcome } = game.state;
    expect(game.state.screen).toBe("end");
    expect(outcome.flick).toBeGreaterThan(0);
    expect(outcome.flick).toBeLessThan(outcome.score);
    expect(core.ft.live.send).not.toHaveBeenCalled();
  }, 60_000);
});

describe("the sound controls", () => {
  it("unfold the volume line from the speaker, follow the finger along it, and switch the music", async () => {
    const { game, sound } = await playing();
    await tap(game, targetOf(game, "speaker"));
    expect(game.state.sound.open).toBe(true);
    const line = targetOf(game, "volume");
    game.pointer({ type: "down", x: line.x + 24, y: line.y + line.h / 2, id: 1 });
    game.pointer({ type: "up", x: line.x + 24, y: line.y + line.h / 2, id: 1 });
    expect(sound.set).toHaveBeenLastCalledWith({ volume: 0 });
    expect(game.state.sound.level).toBe("mute");
    expect(game.state.round.shot).toBeNull();
    await tap(game, targetOf(game, "music"));
    expect(sound.set).toHaveBeenLastCalledWith({ music: false });
  });
});

describe("the looks", () => {
  it("lets the player choose an arrow tip or a place they own, and only shakes a wrapped one", async () => {
    const { game } = await makeGame();
    await tap(game, targetOf(game, "looks"));
    expect(game.state.screen).toBe("looks");
    await tap(game, targetOf(game, "look", 1));
    expect(game.state.progress.chosen.tip).toBe("suction");
    expect(game.state.moments.some((one) => one.kind === "shake")).toBe(true);
    await tap(game, targetOf(game, "tab", "place"));
    expect(game.state.looks).toBe("place");
    await tap(game, targetOf(game, "done"));
    expect(game.state.screen).toBe("home");
  });
});

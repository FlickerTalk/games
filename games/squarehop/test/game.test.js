import { afterEach, describe, expect, it, vi } from "vitest";
import { FLICK } from "../../../kit/src/avatars/index.js";
import { rivalOf } from "../src/flow.js";
import { TIMES } from "../src/round.js";
import { FINISH, diceFor, startRace } from "../src/rules.js";
import { makeGame, memoryStore, playOut, played, tap, targetOf, untilPick } from "./harness.js";

afterEach(() => vi.restoreAllMocks());

const ROUND = 60_000;

describe("opening the game", () => {
  it("shows the home screen and says nothing on the live channel, alone outside a conversation", async () => {
    const { game, core } = await makeGame({ opening: { chat: undefined, live: true } });
    expect(game.state.screen).toBe("home");
    expect(game.state.mode).toBe("alone");
    expect(core.ft.live.send).not.toHaveBeenCalled();
    expect(game.targets().filter((one) => one.kind === "variant").map((one) => one.value)).toEqual(["flick", "pair"]);
    expect(targetOf(game, "rival")).toBeUndefined();
  });

  it("plays against Flick in the FlickerTalk conversation and with the friend in a contact's, each with the rival's seat and no choice of mode", async () => {
    const flick = (await makeGame({ opening: { solo: true } })).game;
    expect(flick.state.mode).toBe("flick");
    expect(rivalOf(flick.state)).toEqual({ who: FLICK.id });
    expect(targetOf(flick, "rival")).toBeTruthy();
    expect(targetOf(flick, "variant")).toBeUndefined();
    const friend = (await makeGame({ opening: { live: true } })).game;
    expect(friend.state.mode).toBe("friend");
    expect(rivalOf(friend.state).who).not.toBe(FLICK.id);
  });
});

describe("a race against Flick", () => {
  it("never starts by itself, and starts from one big play button with both pieces on square 1 and two dice", async () => {
    const made = await makeGame({ opening: { solo: true } });
    const { game, later } = made;
    await later(5000, 500);
    expect(game.state.screen).toBe("home");
    await tap(game, targetOf(game, "play"));
    expect(game.state.screen).toBe("play");
    expect(game.state.round.race).toEqual(startRace());
    expect(targetOf(game, "die")).toBeUndefined();
    await later(TIMES.roll + 50);
    expect(game.targets().filter((one) => one.kind === "die").map((one) => one.value)).toEqual([0, 1]);
    expect(game.state.hint).toBe(true);
  });

  it("hops as many squares as the chosen die, then Flick takes its turn on its own dice after thinking", async () => {
    const made = await makeGame({ opening: { solo: true } });
    const { game, later, sound } = made;
    await tap(game, targetOf(game, "play"));
    await untilPick(made);
    const { key } = game.state.round;
    const mine = diceFor(key, 0);
    await tap(game, targetOf(game, "die", 1));
    expect(game.state.hint).toBe(false);
    expect(targetOf(game, "die")).toBeUndefined();
    await untilPick(made);
    const { race, picks } = game.state.round;
    expect(picks[0]).toBe(1);
    expect(picks.length).toBeGreaterThanOrEqual(2);
    expect(race.at[0]).toBeGreaterThanOrEqual(1 + mine[1]);
    expect(race.at[1]).toBeGreaterThan(1);
    expect(played(sound).filter((name) => name === "tick").length).toBeGreaterThanOrEqual(mine[1]);
    expect(later).toBeTypeOf("function");
  });

  it("plays a whole round to the finish, gives stars, saves the level and nothing ever goes over the wire", { timeout: ROUND }, async () => {
    const made = await makeGame({ opening: { solo: true } });
    const { game, core, store, sound } = made;
    await tap(game, targetOf(game, "play"));
    await playOut(made, (round) => (round.dice[0] > round.dice[1] ? 0 : 1));
    expect(game.state.screen).toBe("end");
    const { outcome } = game.state;
    expect(Math.max(outcome.mine, outcome.theirs)).toBe(FINISH);
    expect(outcome.won).toBe(outcome.mine === FINISH);
    expect(outcome.stars).toBeGreaterThanOrEqual(outcome.won ? 2 : 1);
    expect(JSON.parse(store.kept.get("progress")).level).toBe(outcome.won ? 2 : 1);
    expect(store.kept.get(`round/${core.chat}`)).toBe("null");
    expect(played(sound)).toContain(outcome.won ? "win" : "lose-soft");
    expect(core.ft.live.send).not.toHaveBeenCalled();
    await made.later(30_000, 1000);
    expect(game.state.screen).toBe("end");
    await tap(game, targetOf(game, "again"));
    expect(game.state.screen).toBe("play");
    expect(game.state.round.race).toEqual(startRace());
  });

  it("can be won and can be lost", { timeout: ROUND }, async () => {
    const results = new Set();
    for (let seed = 1; seed <= 12 && results.size < 2; seed += 1) {
      const made = await makeGame({ opening: { solo: true }, seed });
      await tap(made.game, targetOf(made.game, "play"));
      await playOut(made, (round) => (round.dice[0] > round.dice[1] ? 0 : 1));
      results.add(made.game.state.outcome.won);
    }
    expect(results.size).toBe(2);
  });

  it("answers a touch on the dice out of turn with a miss, and takes no die", async () => {
    const made = await makeGame({ opening: { solo: true } });
    const { game, sound } = made;
    await tap(game, targetOf(game, "play"));
    await untilPick(made);
    await tap(game, targetOf(game, "die", 0));
    const before = game.state.round.picks.length;
    await tap(game, game.state.layout.dice[1]);
    expect(game.state.round.picks.length).toBe(before);
    expect(game.state.moments.some((moment) => moment.kind === "miss" && moment.die === 1)).toBe(true);
    expect(played(sound)).toContain("error-soft");
  });

  it("stops while paused and goes on after", async () => {
    const made = await makeGame({ opening: { solo: true } });
    const { game, later } = made;
    await tap(game, targetOf(game, "play"));
    await untilPick(made);
    await tap(game, targetOf(game, "die", 0));
    await tap(game, targetOf(game, "pause"));
    expect(game.resting()).toBe(true);
    const frozen = structuredClone(game.state.round.race);
    await later(8000, 200);
    expect(game.state.round.race).toEqual(frozen);
    expect(game.targets().map((one) => one.kind).sort()).toEqual(["home", "resume"]);
    await tap(game, targetOf(game, "resume"));
    await untilPick(made);
    expect(game.state.round.picks.length).toBeGreaterThan(1);
  });

  it("keeps a round that was left and goes on with it, also after the game is closed", async () => {
    const store = memoryStore();
    const made = await makeGame({ opening: { solo: true }, store });
    const { game, core } = made;
    await tap(game, targetOf(game, "play"));
    await untilPick(made);
    await tap(game, targetOf(game, "die", 0));
    await untilPick(made);
    const { race, picks } = game.state.round;
    await tap(game, targetOf(game, "pause"));
    await tap(game, targetOf(game, "home"));
    expect(game.state.screen).toBe("home");
    const again = await makeGame({ opening: { solo: true }, store, core });
    await tap(again.game, targetOf(again.game, "play"));
    expect(again.game.state.round.race).toEqual(race);
    expect(again.game.state.round.picks).toEqual(picks);
  });
});

describe("two players on one phone", () => {
  it("lets each side choose its own die in turn, without Flick and without levels", { timeout: ROUND }, async () => {
    const made = await makeGame({ opening: { chat: undefined } });
    const { game, store } = made;
    await tap(game, targetOf(game, "variant", "pair"));
    await tap(game, targetOf(game, "play"));
    expect(game.state.round.kind).toBe("pair");
    await untilPick(made);
    await tap(game, targetOf(game, "die", 0));
    await untilPick(made);
    expect(game.state.round.picks).toHaveLength(1);
    expect(game.state.round.race.next).toBe(1);
    await playOut(made);
    expect(game.state.screen).toBe("end");
    expect(game.state.outcome.stars).toBeNull();
    expect(store.kept.has("progress")).toBe(false);
    expect(JSON.parse(store.kept.get("squarehop"))).toEqual({ variant: "pair", taught: true });
  });
});

describe("the menus", () => {
  it("open the looks, choose a track or dice the player owns and shake a wrapped one", async () => {
    const { game, store } = await makeGame({ opening: { solo: true } });
    await tap(game, targetOf(game, "looks"));
    expect(game.state.screen).toBe("looks");
    await tap(game, targetOf(game, "tab", "dice"));
    await tap(game, targetOf(game, "look", 1));
    expect(game.state.progress.chosen.dice).toBe("sky");
    expect(JSON.parse(store.kept.get("progress")).chosen.dice).toBe("sky");
    await tap(game, targetOf(game, "look", 3));
    expect(game.state.progress.chosen.dice).toBe("sky");
    expect(game.state.moments.some((moment) => moment.kind === "shake")).toBe(true);
    await tap(game, targetOf(game, "done"));
    expect(game.state.screen).toBe("home");
  });

  it("open the kit's pick screen for the player's face", async () => {
    const { game } = await makeGame({ opening: { solo: true } });
    await tap(game, targetOf(game, "avatar"));
    expect(game.state.screen).toBe("avatar");
    expect(game.targets().length).toBeGreaterThan(6);
  });

  it("unfold the volume line from the speaker and switch the music", async () => {
    const { game, sound } = await makeGame({ opening: { solo: true } });
    await tap(game, targetOf(game, "speaker"));
    expect(game.state.sound.open).toBe(true);
    expect(targetOf(game, "volume")).toBeTruthy();
    await tap(game, targetOf(game, "music"));
    expect(sound.set).toHaveBeenCalled();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pieceOf } from "../src/pieces.js";
import { anyMove, drag, makeGame, memoryStore, playRound, pointOver, tap, targetOf } from "./harness.js";

const played = (sound) => sound.play.mock.calls.map(([name]) => name);

beforeEach(() => vi.useRealTimers());
afterEach(() => vi.restoreAllMocks());

describe("opening the game", () => {
  it("shows the home screen, says nothing on the live channel, and plays alone without a conversation", async () => {
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

describe("a round", () => {
  it("starts with one big play button and lays a dragged piece where it is aimed", async () => {
    const { game, sound } = await makeGame();
    await tap(game, targetOf(game, "play"));
    expect(game.state.screen).toBe("play");
    expect(sound.music).toHaveBeenLastCalledWith("playful");
    const [slot, at] = anyMove(game.state.round);
    const tiles = pieceOf(game.state.round.slots[slot]).cells.length;
    await drag(game, slot, at);
    expect(game.state.round.score).toBe(tiles);
    expect(game.state.round.slots[slot]).toBeNull();
    expect(played(sound)).toEqual(["pick", "place"]);
  });

  it("sends a piece let go away from the court back to its slot", async () => {
    const { game, sound } = await makeGame();
    await tap(game, targetOf(game, "play"));
    const zone = game.state.layout.slots[0];
    game.pointer({ type: "down", x: zone.x + 20, y: zone.y + 20 });
    game.pointer({ type: "move", x: 5, y: 5 });
    game.pointer({ type: "up", x: 5, y: 5 });
    expect(game.state.round.placements).toEqual([]);
    expect(game.state.round.slots[0]).not.toBeNull();
    expect(game.state.moments.some((moment) => moment.kind === "bounce")).toBe(true);
    expect(played(sound)).toEqual(["pick", "bounce"]);
  });

  it("lights and clears a full row with the chosen line effect", async () => {
    const { game, sound } = await makeGame();
    await tap(game, targetOf(game, "play"));
    const round = game.state.round;
    const cells = [...round.court.cells];
    for (let x = 0; x < 8; x += 1) cells[x] = 1;
    cells[0] = -1;
    cells[63] = 2;
    game.state.round = { ...round, court: { ...round.court, cells }, slots: ["single", "square", "four-h"] };
    game.pointer({ type: "down", ...centre(game.state.layout.slots[0]) });
    const point = pointOver(game, pieceOf("single"), 0);
    game.pointer({ type: "move", ...point });
    expect(game.state.drag.target.lines).toEqual([{ kind: "row", index: 0 }]);
    game.pointer({ type: "up", ...point });
    expect(played(sound).at(-1)).toBe("collect");
    const clear = game.state.moments.find((moment) => moment.kind === "clear");
    expect(clear.effect).toBe("lanterns");
    expect(clear.lines).toHaveLength(1);
    expect(game.state.round.score).toBe(11);
  });

  it("shows the teaching hand on the very first round until a piece is laid, and never again", async () => {
    const store = memoryStore();
    const { game } = await makeGame({ store });
    await tap(game, targetOf(game, "play"));
    expect(game.state.hint).not.toBeNull();
    await drag(game, ...anyMove(game.state.round));
    expect(game.state.hint).toBeNull();
    const again = await makeGame({ store });
    await tap(again.game, targetOf(again.game, "play"));
    expect(again.game.state.hint).toBeNull();
  });

  it("ends on the star screen with the score and the best mark, and nothing starts by itself", async () => {
    const { game, store, later } = await makeGame();
    await tap(game, targetOf(game, "play"));
    await playRound(game, later);
    expect(game.state.screen).toBe("end");
    const { outcome } = game.state;
    expect([1, 2, 3]).toContain(outcome.stars);
    expect(outcome.score).toBe(game.state.round.score);
    expect(outcome.best).toBe(outcome.score);
    expect(JSON.parse(store.kept.get("progress")).best).toBe(outcome.score);
    await later(60_000);
    expect(game.state.screen).toBe("end");
    await tap(game, targetOf(game, "again"));
    expect(game.state.screen).toBe("play");
    expect(game.state.round.placements).toEqual([]);
  });

  it("keeps a round the player leaves through the pause, and goes on with it", async () => {
    const { game } = await makeGame();
    await tap(game, targetOf(game, "play"));
    await drag(game, ...anyMove(game.state.round));
    await tap(game, targetOf(game, "pause"));
    expect(game.state.paused).toBe(true);
    await tap(game, targetOf(game, "home"));
    expect(game.state.screen).toBe("home");
    await tap(game, targetOf(game, "play"));
    expect(game.state.round.placements).toHaveLength(1);
  });
});

describe("playing against Flick", () => {
  it("never calls the live channel, and compares the round with Flick's on the same trays", async () => {
    const { game, core, later } = await makeGame({ opening: { solo: true } });
    await tap(game, targetOf(game, "play"));
    expect(game.state.flick.round.trays).toEqual(game.state.round.trays);
    await playRound(game, later);
    expect(game.state.outcome.rival.score).toBe(game.state.flick.round.score);
    expect(game.state.flick.round.over).not.toBeNull();
    expect(core.ft.live.send).not.toHaveBeenCalled();
  });
});

describe("the sound controls", () => {
  it("unfold the volume line from the speaker, follow the finger along it, and switch the music", async () => {
    const { game, sound } = await makeGame();
    await tap(game, targetOf(game, "play"));
    await tap(game, targetOf(game, "speaker"));
    expect(game.state.sound.open).toBe(true);
    const line = targetOf(game, "volume");
    game.pointer({ type: "down", x: line.x + 24, y: line.y + line.h / 2 });
    game.pointer({ type: "up", x: line.x + 24, y: line.y + line.h / 2 });
    expect(sound.set).toHaveBeenLastCalledWith({ volume: 0 });
    expect(game.state.sound.level).toBe("mute");
    await tap(game, targetOf(game, "music"));
    expect(sound.set).toHaveBeenLastCalledWith({ music: false });
  });
});

const centre = (area) => ({ x: area.x + area.w / 2, y: area.y + area.h / 2 });

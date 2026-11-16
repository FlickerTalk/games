import { describe, expect, it } from "vitest";
import { draw } from "../../../kit/test/canvas/recorder.js";
import { drawPlay, handAt, knightsOf, signalOf } from "../src/board.js";
import { COUNTDOWN, POP_DELAY } from "../src/rounds.js";
import { THEME } from "../src/theme.js";
import { makeGame, phaseOf, press, strikeNow, until } from "./harness.js";

async function playing(opening = { solo: true }, size = {}) {
  const made = await makeGame({ opening, ...size });
  if (opening.variant) await press(made.game, "variant", opening.variant);
  await press(made.game, "play");
  await made.later(COUNTDOWN + 50);
  return made;
}

const shown = (game) => draw((pen) => drawPlay(pen, game, THEME, 2));
const texts = (ctx) => ctx.calls.filter((call) => call.op === "fillText").map((call) => call.text);
const atPhase = (made, phase) => until(made, () => {
  const seen = phaseOf(made.game);
  return seen.phase === phase && (phase !== "go" || made.game.state.round.shown.has(seen.exchange.x)) ? seen.exchange : null;
});
const poses = (game) => knightsOf(game.state, game.now()).map((one) => one.pose);

describe("the play screen", () => {
  it("shows the countdown's digit over the yard before the round, and only the scores once it runs", async () => {
    const made = await makeGame({ opening: { solo: true } });
    await press(made.game, "play");
    await made.later(500);
    expect(texts(shown(made.game))).toContain("3");
    await made.later(COUNTDOWN);
    expect(texts(shown(made.game))).toEqual(["0", "0"]);
    expect(shown(made.game).depth).toBe(0);
  });

  it("stands the player on the left and Flick on the right, swords up while they wait for the bell", async () => {
    const made = await playing();
    const { game } = made;
    expect(poses(game)).toEqual(["wait", "wait"]);
    await atPhase(made, "wait");
    const [mine, theirs] = knightsOf(game.state, game.now());
    expect([mine.pose, theirs.pose]).toEqual(["ready", "ready"]);
    expect(mine).toMatchObject({ player: game.state.player, flip: false, side: "mine", balloon: 1, sword: "broad" });
    expect(theirs).toMatchObject({ player: { who: "flick" }, flip: true, side: "theirs", balloon: 1, sword: "block" });
  });

  it("opens the bell only when the wait is over, and no signal between two exchanges", async () => {
    const made = await playing();
    const { game } = made;
    expect(signalOf(game.state, game.now())).toBeNull();
    await atPhase(made, "wait");
    expect(signalOf(game.state, game.now())).toBeNull();
    await atPhase(made, "go");
    expect(signalOf(game.state, game.now())).toMatchObject({ kind: "bell" });
    const before = shown(game).calls.length;
    await made.later(1900);
    expect(signalOf(game.state, game.now())).toBeNull();
    expect(shown(game).calls.length).toBeLessThan(before);
  });

  it("flies a lure past before the bell on later levels", async () => {
    const made = await makeGame({ opening: { solo: true } });
    made.game.state.progress = { ...made.game.state.progress, level: 12 };
    await press(made.game, "play");
    await made.later(COUNTDOWN);
    const lure = await until(made, () => {
      const seen = signalOf(made.game.state, made.game.now());
      return seen && seen.kind !== "bell" ? seen : null;
    }, { most: 40_000 });
    expect(["bird", "moon", "leaf"]).toContain(lure.kind);
    expect(phaseOf(made.game).phase).toBe("wait");
  });

  it("swings the player's sword, pops Flick's balloon a moment later, makes Flick laugh, and blows up a new balloon for the next exchange", async () => {
    const made = await playing();
    const { game, later } = made;
    const exchange = await atPhase(made, "go");
    await later(200);
    strikeNow(game);
    expect(poses(game)).toEqual(["strike", "ready"]);
    expect(knightsOf(game.state, game.now())[1].balloon).toBe(1);
    await later(POP_DELAY + 40);
    const [, flick] = knightsOf(game.state, game.now());
    expect(flick).toMatchObject({ pose: "laugh", balloon: 0 });
    await later(1300);
    expect(poses(game)).toEqual(["wait", "wait"]);
    expect(knightsOf(game.state, game.now())[1].balloon).toBe(0);
    await until(made, () => phaseOf(game).exchange?.x === exchange.x + 1);
    await later(60);
    const grown = knightsOf(game.state, game.now())[1].balloon;
    expect(grown).toBeGreaterThan(0);
    expect(grown).toBeLessThan(1);
    await later(400);
    expect(knightsOf(game.state, game.now())[1].balloon).toBe(1);
  });

  it("makes the player stumble on a tap before the bell", async () => {
    const made = await playing();
    await atPhase(made, "wait");
    strikeNow(made.game);
    expect(poses(made.game)).toEqual(["stumble", "strike"]);
  });

  it("holds the sword up while a strike waits for the other phone", async () => {
    const made = await playing();
    const { game } = made;
    const exchange = await atPhase(made, "go");
    game.state.round.claims[0].push({ x: exchange.x, r: 300, seat: 0 });
    game.state.round.kind = "friend";
    expect(poses(game)[0]).toBe("windup");
  });

  it("taps the teaching hand on the pad while the bell is open, until the player has struck once", async () => {
    const made = await playing();
    const { game } = made;
    const [pad] = game.state.layout.pads;
    await atPhase(made, "wait");
    const still = handAt(game.state, game.now(), 0.3);
    expect(still.press).toBe(0);
    expect(still.x).toBeGreaterThan(pad.x);
    expect(still.x).toBeLessThan(pad.x + pad.w);
    await atPhase(made, "go");
    expect(handAt(game.state, game.now(), 0.3).press).toBeGreaterThan(0);
    await made.later(200);
    strikeNow(game);
    expect(handAt(game.state, game.now(), 0.3)).toBeNull();
  });

  it("draws two pads for two players on one phone, and the second knight as another person", async () => {
    const made = await playing({ chat: undefined, variant: "pair" });
    const { game } = made;
    expect(game.state.layout.pads).toHaveLength(2);
    const [, theirs] = knightsOf(game.state, game.now());
    expect(theirs.player.who).not.toBe("flick");
    expect(theirs.player.who).not.toBe(game.state.player.who);
    expect(shown(game).depth).toBe(0);
  });

  it("is drawn at a phone's, the smallest room's and a sideways size, in every place", async () => {
    for (const [width, height, fill] of [[384, 801, true], [328, 343, false], [844, 338, true]]) {
      for (const scenery of ["castle", "pillows", "treehouse"]) {
        const made = await makeGame({ opening: { solo: true }, width, height, fill });
        made.game.state.progress = { ...made.game.state.progress, chosen: { sword: "wavy", scenery } };
        await press(made.game, "play");
        await made.later(COUNTDOWN + 2500);
        const ctx = shown(made.game);
        expect(ctx.depth).toBe(0);
        expect(ctx.calls.length).toBeGreaterThan(150);
      }
    }
  });
});

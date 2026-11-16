import { describe, expect, it } from "vitest";
import { draw, shapes } from "../../../kit/test/canvas/recorder.js";
import { OUT } from "../src/body.js";
import { actorsOf, drawPlay } from "../src/board.js";
import { COUNTDOWN } from "../src/rounds.js";
import { THEME } from "../src/theme.js";
import { finger, makeGame, press } from "./harness.js";

async function playing(options = {}) {
  const made = await makeGame({ opening: { solo: true }, ...options });
  await press(made.game, "play");
  await made.later(COUNTDOWN + 200);
  return made;
}

const picture = (game, time = 2) => shapes(draw((pen) => drawPlay(pen, game, THEME, time))).join("\n");

describe("the play screen", () => {
  it("shows this phone's player near the bottom and the other one beyond, whichever seat this phone has", async () => {
    const { game } = await playing();
    const { state } = game;
    const [me, rival] = actorsOf(state, 0);
    expect(me.mine).toBe(true);
    expect(me.y).toBeGreaterThan(state.layout.platform.y);
    expect(rival.y).toBeLessThan(state.layout.platform.y);
    state.round.seat = 1;
    const turned = actorsOf(state, 0).find((one) => one.mine);
    expect(turned.seat).toBe(1);
    expect(turned.y).toBeGreaterThan(state.layout.platform.y);
  });

  it("gives each player their face, Flick the rival's, a ring each, and an arrow only while they can dash", async () => {
    const { game } = await playing();
    const { state } = game;
    const [me, rival] = actorsOf(state, 0);
    expect(me.who).toEqual(state.player);
    expect(rival.who).toEqual({ who: "flick" });
    expect([me.ring, rival.ring]).toEqual(["coral", "aqua"]);
    expect(me.arrow).not.toBeNull();
    state.round.match.bodies[0].stun = 20;
    expect(actorsOf(state, 0)[0]).toMatchObject({ pose: "bumped", arrow: null });
  });

  it("lowers a fallen player to the water beside the platform, behind it when they fell off the far side, and has the other cheer", async () => {
    const { game } = await playing();
    const { state } = game;
    const far = state.round.match.bodies[1];
    Object.assign(far, { x: 0, y: -1.2, out: OUT - 150 });
    state.moments.push({ kind: "point", seat: 0, start: game.now(), duration: 1000 });
    const [me, rival] = actorsOf(state, game.now() / 1000);
    expect(rival).toMatchObject({ pose: "swim", behind: true });
    expect(me.pose).toBe("cheer");
    Object.assign(far, { y: 1.2 });
    expect(actorsOf(state, 0).find((one) => !one.mine).behind).toBe(false);
  });

  it("draws the round without words, its save and restore paired, the button answering a finger and the hand shown until the first dash", async () => {
    const { game, later } = await playing();
    const idle = draw((pen) => drawPlay(pen, game, THEME, 2));
    expect(idle.depth).toBe(0);
    expect(idle.calls.filter((call) => call.op === "fillText")).toEqual([]);
    const before = picture(game);
    finger(game, "down");
    await later(200);
    expect(picture(game)).not.toBe(before);
    finger(game, "up");
    await later(100);
    expect(game.state.taught).toBe(true);
    const taught = draw((pen) => drawPlay(pen, game, THEME, 2));
    game.state.taught = false;
    expect(draw((pen) => drawPlay(pen, game, THEME, 2)).calls.length).toBeGreaterThan(taught.calls.length);
  });

  it("shows the count before the start as a digit, and both players' buttons when two share the device", async () => {
    const made = await makeGame({ opening: { chat: undefined }, width: 1280, height: 748 });
    await press(made.game, "variant", "pair");
    await press(made.game, "play");
    const ctx = draw((pen) => drawPlay(pen, made.game, THEME, 1));
    expect(ctx.calls.filter((call) => call.op === "fillText").map((call) => call.text)).toEqual(["3"]);
    expect(ctx.depth).toBe(0);
  });
});

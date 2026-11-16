import { describe, expect, it } from "vitest";
import { colours, draw, shapes } from "../../../kit/test/canvas/recorder.js";
import { TALL, WIDE } from "../src/arena.js";
import { actorsOf, copiesOf, drawPlay } from "../src/board.js";
import { LOCK } from "../src/match.js";
import { COUNTDOWN } from "../src/rounds.js";
import { THEME } from "../src/theme.js";
import { finger, makeGame, press } from "./harness.js";

async function playing(options = {}) {
  const made = await makeGame({ opening: { solo: true }, ...options });
  await press(made.game, "play");
  made.game.state.round.mind = null;
  await made.later(COUNTDOWN + 200);
  return made;
}

const picture = (game, time = 2) => shapes(draw((pen) => drawPlay(pen, game, THEME, time))).join("\n");

describe("the play screen", () => {
  it("gives each player their face as the pilot, Flick the other's, an aircraft and a colour each, round balloons for this phone's and squared for the other", async () => {
    const { game } = await playing();
    const { state } = game;
    const [rival, me] = actorsOf(state, 0);
    expect(me).toMatchObject({ mine: true, who: state.player, craft: "propeller", colour: "sunny", squared: false, balloons: 3 });
    expect(rival).toMatchObject({ mine: false, who: { who: "flick" }, craft: "jet", colour: "lilac", squared: true, balloons: 3 });
    const { arena } = state.layout;
    for (const one of [me, rival]) {
      expect(one.x).toBeGreaterThanOrEqual(arena.x);
      expect(one.x).toBeLessThanOrEqual(arena.x + arena.w);
      expect(one.y).toBeGreaterThanOrEqual(arena.y);
      expect(one.y).toBeLessThanOrEqual(arena.y + arena.h);
      expect(one.size).toBeGreaterThanOrEqual(40);
    }
  });

  it("shows what each aircraft is doing: the ring closing on the one being aimed at, fewer balloons, laughing under its parachute at the end", async () => {
    const { game } = await playing();
    const { state } = game;
    const [flick, mine] = [state.round.match.crafts[1], state.round.match.crafts[0]];
    flick.lock = LOCK / 2;
    flick.lost = 1;
    expect(actorsOf(state, 0)[0]).toMatchObject({ aim: 0.5, balloons: 2, face: "happy" });
    mine.lost = 3;
    mine.out = 20;
    expect(actorsOf(state, 0)[1]).toMatchObject({ pose: "losing", balloons: 0, face: "laughing" });
    flick.hurt = 30;
    expect(actorsOf(state, 0)[0]).toMatchObject({ pose: "hit", face: "surprised" });
  });

  it("turns the headings with the sky when it lies on its side", async () => {
    const { game } = await playing({ width: 360, height: 343, fill: false });
    const me = actorsOf(game.state, 0).find((one) => one.mine);
    expect(game.state.layout.arena.side).toBe(true);
    expect(me.heading).toEqual([-1, 0]);
  });

  it("draws an aircraft again on the opposite side while it crosses an edge", () => {
    const layout = { arena: { x: 10, y: 100, w: 300, h: 420, unit: 300, side: false } };
    expect(copiesOf(layout, 160, 300, 30)).toEqual([[160, 300]]);
    expect(copiesOf(layout, 20, 300, 30)).toEqual([[20, 300], [320, 300]]);
    expect(copiesOf(layout, 300, 300, 30)).toEqual([[300, 300], [0, 300]]);
    expect(copiesOf(layout, 160, 110, 30)).toEqual([[160, 110], [160, 530]]);
    expect(copiesOf(layout, 15, 105, 30)).toHaveLength(4);
  });

  it("draws the round without words, its save and restore paired, with the hand shown until the first steer", async () => {
    const { game, later } = await playing();
    const idle = draw((pen) => drawPlay(pen, game, THEME, 2));
    expect(idle.depth).toBe(0);
    expect(idle.calls.filter((call) => call.op === "fillText")).toEqual([]);
    expect(colours(idle)).toContain(THEME.ui.paper);
    const before = picture(game);
    finger(game, "down");
    await later(300);
    expect(picture(game)).not.toBe(before);
    finger(game, "up");
    await later(100);
    expect(game.state.taught).toBe(true);
    expect(colours(draw((pen) => drawPlay(pen, game, THEME, 2)))).not.toContain(THEME.ui.paper);
  });

  it("shows the count before the start as a digit", async () => {
    const made = await makeGame({ opening: { solo: true } });
    await press(made.game, "play");
    const ctx = draw((pen) => drawPlay(pen, made.game, THEME, 1));
    expect(ctx.calls.filter((call) => call.op === "fillText").map((call) => call.text)).toEqual(["3"]);
    expect(ctx.depth).toBe(0);
  });

  it("draws everything the sky holds at the fullest level, at a phone's size and on its side", async () => {
    for (const size of [{}, { width: 844, height: 338 }]) {
      const { game, later } = await playing(size);
      const { round } = game.state;
      const full = { ...round.match.sky, clouds: [{ x: 0.5, y: 0.3, r: 0.15 }], wind: { y: 0.9, tall: 0.24, push: -0.11 }, ring: { x: 0.2, y: 0.5, r: 0.1 }, airship: { x: 0.8, y: 1.1, r: 0.12, drift: 0.035 } };
      const plain = draw((pen) => drawPlay(pen, game, THEME, 2));
      round.match.sky = full;
      const busy = draw((pen) => drawPlay(pen, game, THEME, 2));
      expect(busy.calls.length).toBeGreaterThan(plain.calls.length + 60);
      expect(colours(busy)).toEqual(expect.arrayContaining([THEME.art.weather.cloud, THEME.art.airship.body, ...THEME.art.rainbow]));
      game.state.moments.push({ kind: "pop", seat: 1, by: 0, left: 2, x: 0.5, y: 0.5, from: { x: 0.5, y: 0.8 }, start: game.now(), duration: 900 }, { kind: "ring", seat: 0, x: 0.2, y: 0.5, start: game.now(), duration: 600 });
      await later(60);
      const popping = draw((pen) => drawPlay(pen, game, THEME, game.now() / 1000));
      expect(colours(popping)).toContain(THEME.art.effects.cork);
      expect(popping.depth).toBe(0);
      expect(TALL / WIDE).toBeCloseTo(1.4);
    }
  });
});

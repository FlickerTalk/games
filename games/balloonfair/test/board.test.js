import { describe, expect, it } from "vitest";
import { bounds, draw } from "../../../kit/test/canvas/recorder.js";
import { drawPlay, handAt } from "../src/board.js";
import { COUNTDOWN } from "../src/rounds.js";
import { THEME } from "../src/theme.js";
import { drag, makeGame, onShow, press, tapAt, until } from "./harness.js";

async function playing(tool = "popgun", size = {}) {
  const made = await makeGame({ opening: { solo: true }, ...size });
  await press(made.game, "variant", tool);
  await press(made.game, "play");
  await made.later(COUNTDOWN + 100);
  return made;
}

const shown = (game) => draw((pen) => drawPlay(pen, game, THEME, 2));
const count = (ctx, op) => ctx.calls.filter((call) => call.op === op).length;
const texts = (ctx) => ctx.calls.filter((call) => call.op === "fillText").map((call) => call.text);

describe("the play screen", () => {
  it("shows the countdown's digit over the stall before the round, and none once it runs", async () => {
    const made = await makeGame({ opening: { chat: undefined } });
    await press(made.game, "play");
    await made.later(500);
    expect(texts(shown(made.game))).toContain("3");
    await made.later(COUNTDOWN);
    expect(texts(shown(made.game))).toEqual(["0"]);
  });

  it("draws more as balloons come up, and keeps the balloons inside the stall", async () => {
    const made = await playing();
    const before = shown(made.game).calls.length;
    await until(made, () => onShow(made.game).length >= 3);
    const ctx = shown(made.game);
    expect(ctx.calls.length).toBeGreaterThan(before);
    expect(count(ctx, "clip")).toBeGreaterThanOrEqual(2);
    expect(ctx.depth).toBe(0);
  });

  it("points the teaching hand at a balloon until the player has popped one with that toy", async () => {
    const made = await playing();
    const { game } = made;
    const hand = await until(made, () => handAt(game.state, 2));
    const found = onShow(game).find((one) => Math.abs(one.x - hand.x) < 1 && Math.abs(one.y - hand.y) < 1);
    expect(found).toBeDefined();
    tapAt(game, found.x, found.y);
    expect(handAt(game.state, 2)).toBeNull();
  });

  it("shows the bow's hand pulling down from the middle of the stall", async () => {
    const { game } = await playing("bow");
    const { field } = game.state.layout;
    const [start, end] = [handAt(game.state, 0.1), handAt(game.state, 1.2)];
    expect(end.y).toBeGreaterThan(start.y);
    expect(start.x).toBeCloseTo(field.x + field.w / 2, 0);
    expect(end.y).toBeLessThan(field.y + field.h);
  });

  it("draws the dotted aim line from the bow while the player pulls, and not before", async () => {
    const { game } = await playing("bow");
    const dots = (ctx) => ctx.calls.filter((call) => call.op === "arc" && call.radius < 6.5 && call.radius > 2.9).length;
    game.state.taught = ["bow"];
    const rest = dots(shown(game));
    game.state.taught = [];
    game.pointer({ type: "down", x: 200, y: 400, id: 1 });
    game.pointer({ type: "move", x: 210, y: 480, id: 1 });
    expect(handAt(game.state, 1.2)).toBeNull();
    expect(dots(shown(game))).toBe(rest + 7);
    game.pointer({ type: "up", x: 210, y: 480, id: 1 });
    expect(game.state.round.pull).toBeNull();
  });

  it("answers a miss with a puff where the cork went, and a pop with its pieces and the player's mark", async () => {
    const made = await playing();
    const { game, later } = made;
    const { field } = game.state.layout;
    tapAt(game, field.x + 12, field.y + field.h * 0.5);
    await later(200);
    expect(game.state.moments.map((one) => one.kind)).toContain("miss");
    await later(300);
    const found = await until(made, () => onShow(game)[0]);
    tapAt(game, found.x, found.y);
    await later(200);
    const pop = game.state.moments.find((one) => one.kind === "pop" && one.by === 0);
    expect(pop).toMatchObject({ by: 0, look: found.balloon.kind });
    expect(shown(game).depth).toBe(0);
  });

  it("stays inside the frame at a phone's, the smallest room's and a tablet's size, with every toy", async () => {
    for (const [width, height, fill] of [[384, 801, true], [328, 343, false], [1280, 748, true]]) {
      for (const tool of ["popgun", "blaster", "bow"]) {
        const made = await playing(tool, { width, height, fill });
        await made.later(4000);
        if (tool === "bow") drag(made.game, { x: width / 2, y: height / 2 }, { x: width / 2 + 10, y: height / 2 + 60 });
        else tapAt(made.game, width / 2, height / 2);
        await made.later(100);
        const ctx = shown(made.game);
        const clips = ctx.calls.filter((call) => call.op === "rect").map((call) => bounds(call.points));
        for (const area of clips) {
          expect(area.left, `${width} ${tool}`).toBeGreaterThanOrEqual(-0.5);
          expect(area.right, `${width} ${tool}`).toBeLessThanOrEqual(width + 0.5);
          expect(area.bottom, `${width} ${tool}`).toBeLessThanOrEqual(height + 0.5);
        }
        expect(ctx.depth).toBe(0);
      }
    }
  });
});

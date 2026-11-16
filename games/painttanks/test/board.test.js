import { describe, expect, it } from "vitest";
import { bounds, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { markersOf } from "../src/board.js";
import { drawFrame, playScene } from "../src/frame.js";
import { THEME } from "../src/theme.js";
import { makeGame, tap, targetOf } from "./harness.js";

const frame = (game, time = 0.5) => draw((ctx) => drawFrame(ctx, game, THEME, time));
const words = (ctx) => ctx.calls.filter((call) => call.op === "fillText").map((call) => call.text);

async function playing(opening = { solo: true }) {
  const made = await makeGame({ opening });
  await tap(made.game, targetOf(made.game, "play"));
  await made.later(600);
  return made;
}

describe("the play screen", () => {
  it("draws the battlefield over the whole frame, then the bar and the controls, with digits as its only words", async () => {
    const { game } = await playing();
    const ctx = frame(game);
    expect(ctx.depth).toBe(0);
    expect(ctx.calls[0].op).toBe("clearRect");
    const box = bounds(painted(ctx));
    expect(box.left).toBeLessThanOrEqual(0);
    expect(box.right).toBeGreaterThanOrEqual(384);
    expect(box.bottom).toBeGreaterThanOrEqual(801);
    for (const text of words(ctx)) expect(text).toMatch(/^-?[\d٠-٩]+$/);
    expect(words(ctx)).toContain("45");
  });

  it("puts the player's own vehicle on the left, mirroring the battlefield for the player on the right", async () => {
    const { game } = await playing();
    game.state.round.mySide = 1;
    const mirrored = frame(game);
    game.state.round.mySide = 0;
    const plain = frame(game);
    expect(mirrored.calls.length).toBeGreaterThan(100);
    expect(mirrored.calls.some((call) => call.op === "save")).toBe(true);
    expect(JSON.stringify(mirrored.calls.slice(0, 400))).not.toBe(JSON.stringify(plain.calls.slice(0, 400)));
  });

  it("shows whose vehicle is whose with a face above each, the player's and Flick's", async () => {
    const { game } = await playing();
    const scene = playScene(game);
    expect(scene.players.map((one) => one?.who)).toEqual([game.state.player.who, "flick"]);
    const marks = markersOf(scene);
    expect(marks).toHaveLength(2);
    const ctx = frame(game);
    for (const mark of marks) {
      expect(mark.size).toBeGreaterThanOrEqual(32);
      expect(mark.y - mark.size / 2).toBeGreaterThan(scene.layout.angle.y + scene.layout.angle.h);
      expect(painted(ctx).some(([x, y]) => Math.hypot(x - mark.x, y - mark.y) < mark.size / 2)).toBe(true);
    }
    expect(marks.filter((one) => one.turn)).toHaveLength(scene.turnSide === null ? 0 : 1);
  });

  it("draws the slingshot while the player pulls, and the ball while it flies", async () => {
    const { game, later } = await playing({ chat: undefined });
    const near = (ctx, [px, py]) => painted(ctx).some(([x, y]) => Math.hypot(x - px, y - py) < 1.5);
    const [x, y] = game.anchorOnScreen();
    expect(near(frame(game), [x - 70, y + 50])).toBe(false);
    game.pointer({ type: "down", x: x - 10, y: y + 10 });
    game.pointer({ type: "move", x: x - 70, y: y + 50 });
    expect(near(frame(game), [x - 70, y + 50])).toBe(true);
    game.pointer({ type: "up", x: x - 70, y: y + 50 });
    expect(game.state.round.flight).not.toBeNull();
    await later(100);
    expect(frame(game).calls.length).toBeGreaterThan(100);
  });

  it("draws the pause card over a paused round", async () => {
    const { game } = await playing();
    await tap(game, targetOf(game, "pause"));
    const resume = targetOf(game, "resume");
    const centre = [resume.x + resume.w / 2, resume.y + resume.h / 2];
    expect(painted(frame(game)).some(([x, y]) => Math.hypot(x - centre[0], y - centre[1]) < 1)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { bounds, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawPlay } from "../src/board.js";
import { THEME } from "../src/theme.js";
import { anyMove, makeGame, pointOver, tap, targetOf } from "./harness.js";
import { pieceOf } from "../src/pieces.js";

const texts = (ctx) => ctx.calls.filter((call) => call.op === "fillText").map((call) => call.text);

async function playing(options) {
  const made = await makeGame(options);
  await tap(made.game, targetOf(made.game, "play"));
  return made;
}

describe("the play screen's drawing", () => {
  it("draws the courtyard, the court, the tray and the bar inside the frame, with digits as its only writing", async () => {
    const { game } = await playing();
    const ctx = draw((pen) => drawPlay(pen, game.state, THEME, 1.2));
    const box = bounds(painted(ctx));
    expect(box.left).toBeGreaterThanOrEqual(-1);
    expect(box.right).toBeLessThanOrEqual(385);
    expect(box.bottom).toBeLessThanOrEqual(801);
    for (const text of texts(ctx)) expect(text).toMatch(/^\+?[\d,]+$/);
    expect(ctx.depth).toBe(0);
  });

  it("shows the lifted piece above the finger and the outline where it would land", async () => {
    const { game } = await playing();
    const [slot, at] = anyMove(game.state.round);
    const piece = pieceOf(game.state.round.slots[slot]);
    const zone = game.state.layout.slots[slot];
    game.pointer({ type: "down", x: zone.x + 20, y: zone.y + 20 });
    const point = pointOver(game, piece, at);
    game.pointer({ type: "move", ...point });
    const resting = draw((pen) => drawPlay(pen, { ...game.state, hint: null, drag: { phase: "idle" } }, THEME, 0)).calls.length;
    const carried = draw((pen) => drawPlay(pen, { ...game.state, hint: null }, THEME, 0));
    expect(carried.calls.length).toBeGreaterThan(resting);
    expect(carried.calls.some((call) => call.op === "stroke")).toBe(true);
  });

  it("shows the teaching hand only while the hint is on", async () => {
    const { game } = await playing();
    const withHint = draw((pen) => drawPlay(pen, game.state, THEME, 0.5)).calls.length;
    const without = draw((pen) => drawPlay(pen, { ...game.state, hint: null }, THEME, 0.5)).calls.length;
    expect(withHint).toBeGreaterThan(without);
  });

  it("darkens the court under the pause and draws its two buttons", async () => {
    const { game } = await playing();
    await tap(game, targetOf(game, "pause"));
    const paused = draw((pen) => drawPlay(pen, game.state, THEME, 0));
    expect(paused.calls.some((call) => call.op === "fillRect" && call.points[0][0] === 0 && call.points[1][0] === 384)).toBe(true);
  });

  it("draws Flick beside the score when playing against the phone", async () => {
    const alone = await playing();
    const flick = await playing({ opening: { solo: true } });
    const count = (game) => draw((pen) => drawPlay(pen, game.state, THEME, 0)).calls.length;
    expect(flick.game.state.layout.rival).not.toBeNull();
    expect(count(flick.game)).toBeGreaterThan(count(alone.game));
  });
});

import { describe, expect, it } from "vitest";
import { bounds, draw, painted, shapes } from "../../../kit/test/avatars/recorder.js";
import { drawEnd, drawPrompt } from "../src/end-art.js";
import { THEME } from "../src/theme.js";
import { makeGame, playRound, tap, targetOf } from "./harness.js";

const texts = (ctx) => ctx.calls.filter((call) => call.op === "fillText").map((call) => call.text);

async function ended(options) {
  const made = await makeGame(options);
  await tap(made.game, targetOf(made.game, "variant", "small"));
  await tap(made.game, targetOf(made.game, "play"));
  await playRound(made.game, made.later);
  return made;
}

describe("the end of a round's drawing", () => {
  it("shows the stars, the score and the best mark in digits only, inside the frame", async () => {
    const { game } = await ended();
    const ctx = draw((pen) => drawEnd(pen, game.state, null, THEME, 1));
    expect(texts(ctx).length).toBeGreaterThanOrEqual(2);
    for (const text of texts(ctx)) expect(text).toMatch(/^\+?[\d,]+$/);
    const box = bounds(painted(ctx));
    expect(box.right).toBeLessThanOrEqual(385);
    expect(box.bottom).toBeLessThanOrEqual(802);
    expect(ctx.depth).toBe(0);
  });

  it("draws a wrapped gift until it is opened, then the look it held", async () => {
    const { game } = await ended();
    const outcome = { ...game.state.outcome, gift: "leaves", opened: false };
    const wrapped = shapes(draw((pen) => drawEnd(pen, { ...game.state, outcome }, null, THEME, 1)));
    const opened = shapes(draw((pen) => drawEnd(pen, { ...game.state, outcome: { ...outcome, opened: true } }, null, THEME, 1)));
    const none = shapes(draw((pen) => drawEnd(pen, { ...game.state, outcome: { ...outcome, gift: null } }, null, THEME, 1)));
    expect(wrapped).not.toEqual(opened);
    expect(wrapped).not.toEqual(none);
  });

  it("puts the rival beside the player with both scores when there is one", async () => {
    const { game } = await ended();
    const rival = { player: { who: "flick" }, score: 77 };
    const ctx = draw((pen) => drawEnd(pen, game.state, rival, THEME, 1));
    expect(texts(ctx)).toContain("77");
    const waiting = draw((pen) => drawEnd(pen, game.state, { player: { who: "noa" }, score: null }, THEME, 1));
    expect(texts(waiting)).not.toContain("77");
  });
});

describe("the friend's invitation", () => {
  it("shows the friend's face and two buttons, without words", () => {
    const ctx = draw((pen) => drawPrompt(pen, { width: 384, height: 801, fill: true, player: { who: "ari" } }, THEME, 0));
    expect(texts(ctx)).toEqual([]);
    expect(ctx.depth).toBe(0);
  });
});

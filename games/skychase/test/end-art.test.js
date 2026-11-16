import { describe, expect, it } from "vitest";
import { bounds, draw } from "../../../kit/test/canvas/recorder.js";
import { drawEnd } from "../src/end-art.js";
import { COUNTDOWN, END_PAUSE } from "../src/rounds.js";
import { THEME } from "../src/theme.js";
import { makeGame, press, unclipped } from "./harness.js";

async function ended({ mine = 3, gift = null, width = 384, height = 801 } = {}) {
  const made = await makeGame({ opening: { solo: true }, width, height });
  const { game, later } = made;
  await press(game, "play");
  await later(COUNTDOWN + 200);
  const { round } = game.state;
  round.mind = null;
  round.match.crafts[1].lost = mine;
  round.match.roundSteps = round.match.step + 5;
  await later(END_PAUSE + 400);
  if (gift) game.state.outcome.gift = gift;
  return made;
}

describe("the end of a round", () => {
  it("shows the card over the round with both players' balloons popped, digits its only glyphs, inside the frame", async () => {
    for (const [width, height] of [[384, 801], [844, 338], [360, 343]]) {
      const { game } = await ended({ width, height });
      expect(game.state).toMatchObject({ screen: "end", outcome: { mine: 3, theirs: 0, won: true, stars: 3 } });
      const ctx = draw((pen) => drawEnd(pen, game, THEME, 3));
      const text = ctx.calls.filter((call) => call.op === "fillText").map((call) => call.text);
      expect(text.every((one) => /^[\d\s.,:–-]+$/.test(one))).toBe(true);
      expect(text).toContain("3");
      const area = bounds(unclipped(ctx));
      expect(area.right).toBeLessThanOrEqual(width + 1);
      expect(area.bottom).toBeLessThanOrEqual(height + 1);
      expect(ctx.depth).toBe(0);
    }
  });

  it("throws confetti only for a round won, and draws a gift wrapped until it is opened", async () => {
    const won = await ended({ mine: 3 });
    expect(won.game.state.moments.some((one) => one.kind === "confetti")).toBe(true);
    const lost = await ended({ mine: 0 });
    expect(lost.game.state.moments).toEqual([]);
    const { game } = await ended({ gift: "seaplane" });
    const wrapped = draw((pen) => drawEnd(pen, game, THEME, 3)).calls.length;
    await press(game, "gift");
    expect(game.state.outcome.opened).toBe(true);
    expect(draw((pen) => drawEnd(pen, game, THEME, 3)).calls.length).not.toBe(wrapped);
  });
});

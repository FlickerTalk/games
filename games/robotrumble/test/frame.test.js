import { describe, expect, it } from "vitest";
import { draw } from "../../../kit/test/canvas/recorder.js";
import { tokensFor } from "../../../kit/test/canvas/themes.js";
import { drawFrame } from "../src/frame.js";
import { COUNTDOWN } from "../src/rounds.js";
import { THEME, themeFor } from "../src/theme.js";
import { beatHabit, makeGame, press } from "./harness.js";

const words = (ctx) => ctx.calls.filter((call) => call.op === "fillText" && !/^[\d\s.,:–-]+$/.test(call.text)).map((call) => call.text);
const SIZES = [[384, 801, true], [360, 343, false], [844, 338, true]];

async function screens(width, height, fill) {
  const shown = [];
  const look = async (name, game) => shown.push([name, draw((pen) => drawFrame(pen, game, THEME, 2))]);
  const { game } = await makeGame({ opening: { solo: true }, width, height, fill });
  await look("home", game);
  await press(game, "looks");
  await look("looks", game);
  await press(game, "tab", "stage");
  await look("stages", game);
  await press(game, "done");
  await press(game, "avatar");
  await look("avatar", game);
  const friend = await makeGame({ opening: { live: true }, width, height, fill });
  await look("friend home", friend.game);
  const alone = await makeGame({ opening: { chat: undefined }, width, height, fill });
  await look("alone home", alone.game);
  const round = await makeGame({ opening: { solo: true }, width, height, fill });
  await press(round.game, "play");
  await look("countdown", round.game);
  await round.later(COUNTDOWN + 5000, { each: beatHabit });
  await look("play", round.game);
  await press(round.game, "pause");
  await look("pause", round.game);
  await press(round.game, "resume");
  await round.later(40_000, { each: beatHabit });
  await look("end", round.game);
  return { shown, state: round.game.state };
}

describe("every screen", () => {
  it("is drawn without words but the kit's pick screen's names, its save and restore paired, at a phone's, a room's and a sideways size", { timeout: 60_000 }, async () => {
    for (const [width, height, fill] of SIZES) {
      const { shown, state } = await screens(width, height, fill);
      expect(state.screen).toBe("end");
      for (const [name, ctx] of shown) {
        if (name !== "avatar") expect(words(ctx), `${name} ${width}x${height}`).toEqual([]);
        expect(ctx.depth, `${name} ${width}x${height}`).toBe(0);
        expect(ctx.calls.length, `${name} ${width}x${height}`).toBeGreaterThan(20);
      }
    }
  });

  it("is drawn in the app's dark colours as well", async () => {
    const { game } = await makeGame({ opening: { solo: true } });
    const dark = themeFor(tokensFor("ember-dark"), { dark: true });
    await press(game, "play");
    expect(() => draw((pen) => drawFrame(pen, game, dark, 1))).not.toThrow();
  });
});

import { describe, expect, it } from "vitest";
import { draw } from "../../../kit/test/canvas/recorder.js";
import { tokensFor } from "../../../kit/test/canvas/themes.js";
import { drawFrame } from "../src/frame.js";
import { COUNTDOWN } from "../src/rounds.js";
import { THEME, themeFor } from "../src/theme.js";
import { makeGame, press, unhurried } from "./harness.js";

const words = (ctx) => ctx.calls.filter((call) => call.op === "fillText" && !/^[\d\s.,:–-]+$/.test(call.text)).map((call) => call.text);
const SIZES = [[384, 801, true], [360, 343, false], [844, 338, true]];

async function screens(width, height, fill) {
  const shown = [];
  const look = async (name, game) => shown.push([name, draw((pen) => drawFrame(pen, game, THEME, 2))]);
  const { game } = await makeGame({ opening: { solo: true }, width, height, fill });
  await look("home", game);
  await press(game, "looks");
  await look("looks", game);
  await press(game, "done");
  await press(game, "avatar");
  await look("avatar", game);
  const friend = await makeGame({ opening: { live: true }, width, height, fill });
  await look("friend home", friend.game);
  const alone = await makeGame({ opening: { chat: undefined }, width, height, fill });
  await look("alone home", alone.game);
  for (const tool of ["popgun", "blaster", "bow"]) {
    const round = await makeGame({ opening: { solo: true }, width, height, fill });
    await press(round.game, "variant", tool);
    await press(round.game, "play");
    await look(`${tool} countdown`, round.game);
    await round.later(COUNTDOWN + 6000, { each: unhurried });
    await look(`${tool} playing`, round.game);
    if (tool !== "popgun") continue;
    await round.later(30_000, { each: unhurried });
    await round.later(3000);
    await look("end", round.game);
  }
  return { shown };
}

describe("every screen", () => {
  it("is drawn without words but the kit's pick screen's names, its save and restore paired, at a phone's, a room's and a sideways size", { timeout: 60_000 }, async () => {
    for (const [width, height, fill] of SIZES) {
      const { shown } = await screens(width, height, fill);
      expect(shown.map(([name]) => name)).toContain("end");
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

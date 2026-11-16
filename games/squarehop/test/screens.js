import { recorder } from "../../../kit/test/canvas/recorder.js";
import { tokensFor } from "../../../kit/test/canvas/themes.js";
import { themeFor } from "../src/theme.js";
import { makeGame, playOut, tap, targetOf, untilPick } from "./harness.js";

export const LIGHT = themeFor(tokensFor("mono-light"));
export const DARK = themeFor(tokensFor("mono-dark"));
export const FRAMES = [[384, 801, true], [360, 343, false], [1280, 748, true], [844, 338, true]];

export async function gameAt(screen, { width = 384, height = 801, fill = true, opening = { solo: true } } = {}) {
  const made = await makeGame({ width, height, fill, opening });
  const { game } = made;
  if (screen === "home") return made;
  await tap(game, targetOf(game, "play"));
  await untilPick(made);
  if (screen === "play") return made;
  if (screen === "hopping") {
    await tap(game, targetOf(game, "die", 0));
    await made.later(450);
    return made;
  }
  await playOut(made);
  return made;
}

export const texts = (ctx) => ctx.calls.filter((call) => call.op === "fillText" || call.op === "strokeText").map((call) => call.text);

export function paint(drawing) {
  const ctx = recorder();
  drawing(ctx);
  return ctx;
}

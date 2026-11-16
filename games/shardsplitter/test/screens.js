import { recorder } from "../../../kit/test/canvas/recorder.js";
import { tokensFor } from "../../../kit/test/canvas/themes.js";
import { themeFor } from "../src/theme.js";
import { finishRound, hitRight, makeGame, settled, tap, targetOf } from "./harness.js";

export const LIGHT = themeFor(tokensFor("mono-light"));
export const DARK = themeFor(tokensFor("mono-dark"));
export const SIZES = [[384, 801, true], [360, 343, false], [1280, 748, true], [844, 338, true]];

export async function gameAt(screen, { width = 384, height = 801, fill = true, opening = {} } = {}) {
  const made = await makeGame({ width, height, fill, opening });
  const { game } = made;
  if (screen === "home") return made;
  await tap(game, targetOf(game, "play"));
  await settled(game, made.later);
  if (screen === "play") return made;
  if (screen === "split") {
    await hitRight(game, made.later);
    await made.later(250);
    return made;
  }
  await finishRound(game, made.later);
  return made;
}

export function texts(ctx) {
  return ctx.calls.filter((call) => call.op === "fillText" || call.op === "strokeText").map((call) => call.text);
}

export function fonts(ctx) {
  return ctx.calls.filter((call) => call.op === "set" && call.name === "font").map((call) => Number(/(\d+(?:\.\d+)?)px/.exec(call.value)[1]));
}

export function paint(drawing) {
  const ctx = recorder();
  drawing(ctx);
  return ctx;
}

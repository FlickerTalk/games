import { recorder } from "../../../kit/test/canvas/recorder.js";
import { tokensFor } from "../../../kit/test/canvas/themes.js";
import { themeFor } from "../src/theme.js";
import { completeRound, makeGame, tap, targetOf, until } from "./harness.js";

export const LIGHT = themeFor(tokensFor("mono-light"));
export const DARK = themeFor(tokensFor("mono-dark"));
export const SIZES = [[384, 801, true], [360, 343, false], [1280, 748, true], [844, 338, true]];

export async function gameAt(screen, { width = 384, height = 801, fill = true, opening = {} } = {}) {
  const made = await makeGame({ width, height, fill, opening });
  const { game } = made;
  if (screen === "home") return made;
  if (screen === "build") {
    await tap(game, targetOf(game, "variant", "make"));
    await tap(game, targetOf(game, "play"));
    for (const kind of [0, 1, 0, 1]) await tap(game, targetOf(game, "wagon", kind));
    if (targetOf(game, "slot", 3)) await tap(game, targetOf(game, "slot", 3));
    return made;
  }
  await tap(game, targetOf(game, "play"));
  if (screen === "arriving") return made;
  await until(made, (state) => state.round.phase === "solve");
  if (screen === "play") return made;
  if (screen === "tune") {
    const { completeTrain } = await import("./harness.js");
    await completeTrain(made);
    await made.later(700);
    return made;
  }
  await completeRound(made);
  return made;
}

export function texts(ctx) {
  return ctx.calls.filter((call) => call.op === "fillText" || call.op === "strokeText").map((call) => call.text);
}

export function paint(drawing) {
  const ctx = recorder();
  drawing(ctx);
  return ctx;
}

import { recorder } from "../../../kit/test/canvas/recorder.js";
import { tokensFor } from "../../../kit/test/canvas/themes.js";
import { themeFor } from "../src/theme.js";
import { makeGame, tap, targetOf, type } from "./harness.js";

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
    return made;
  }
  await tap(game, targetOf(game, "play"));
  if (screen === "play") return made;
  await type(game, ["F", "F"]);
  if (screen === "running") {
    await tap(game, targetOf(game, "play"));
    await made.later(300);
    return made;
  }
  const { shortest } = await import("../src/solver.js");
  game.state.round.edit = { items: shortest(game.state.round.level), open: false };
  await tap(game, targetOf(game, "play"));
  await made.later(30_000, 100);
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

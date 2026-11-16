import assert from "node:assert/strict";
import { decodeLevel } from "../games/beeproute/src/level.js";
import { shortest } from "../games/beeproute/src/solver.js";
import { toneOf, toneShares, walkCanvasGame } from "./canvas-walk.js";

const OUT = "/private/tmp/ftgames-beeproute-shots";
const PICK_SCREEN_OVERFLOWS_THE_SMALLEST_ROOM = { inside: false };
const WALL_AT = 14;

const stateOf = (s) =>
  s.evaluate(() => {
    const { screen, round, build } = document.getElementById("view").game.state;
    return {
      screen,
      code: round?.code ?? null,
      slots: round ? round.edit.items.length : 0,
      running: Boolean(round?.run),
      back: round ? round.back !== null : false,
      fails: round?.fails ?? 0,
      driver: round?.driver ?? null,
      wall: build ? build.level.cells[14] : null,
      sendable: build ? build.check.ok : null,
    };
  });

async function until(s, test, { limit = 60_000, step = 200 } = {}) {
  for (let waited = 0; waited < limit; waited += step) {
    const seen = await stateOf(s);
    if (test(seen)) return seen;
    await s.page.waitForTimeout(step);
  }
  return stateOf(s);
}

async function type(s, commands) {
  for (const command of commands) await s.tap("command", command);
}

async function tapCell(s, at) {
  const found = (await s.targets()).find((one) => one.kind === "cell" && one.value[0] === at);
  assert.ok(found, `no square ${at} to tap`);
  await s.page.mouse.click(...(await s.at(found.x + found.w / 2, found.y + found.h / 2)));
  await s.page.waitForTimeout(300);
}

async function solveLevel(s, { check, label }) {
  await s.tap("play");
  await s.shot("2-hint");
  const way = shortest(decodeLevel((await stateOf(s)).code));
  await type(s, way.slice(0, 1));
  await check(`${label}: a tapped arrow lands on the strip`, async () => assert.equal((await stateOf(s)).slots, 1));
  await s.tap("play");
  await until(s, (seen) => !seen.running);
  await s.shot("3-shrug");
  await check(`${label}: a program that stops short is no failure screen, the robot just goes back`, async () => {
    const seen = await until(s, (one) => !one.back);
    assert.deepEqual([seen.screen, seen.fails], ["play", 1]);
  });
  await type(s, way.slice(1));
  await s.shot("4-program");
  await s.tap("pause");
  await s.shot("5-pause");
  await s.tap("resume");
  await s.tap("speaker");
  await s.shot("6-volume");
  await s.tap("speaker");
  await s.tap("play");
  await s.page.waitForTimeout(900);
  await s.shot("7-running");
  await check(`${label}: the robot reaches the goal and the level ends on the star screen`, async () => assert.equal((await until(s, (seen) => seen.screen === "end")).screen, "end"));
  await s.page.waitForTimeout(600);
  await s.shot("8-end");
}

async function makeLevel(s, { check, label, flick }) {
  await s.tap("variant", "make");
  await s.tap("play");
  await check(`${label}: making a level opens the builder`, async () => assert.equal((await stateOf(s)).screen, "build"));
  await tapCell(s, WALL_AT);
  await s.shot("10-build");
  await check(`${label}: a tapped square takes the wall, and the level can still be solved`, async () => {
    const seen = await stateOf(s);
    assert.deepEqual([seen.wall, seen.sendable], ["#", true]);
  });
  await s.tap("send");
  const seen = await stateOf(s);
  await check(`${label}: the level made is played ${flick ? "by Flick" : "by its maker"}`, async () => assert.deepEqual([seen.screen, seen.driver], ["play", flick ? "flick" : "me"]));
  if (!flick) return;
  await s.page.waitForTimeout(2500);
  await s.shot("11-flick-solving");
  await check(`${label}: Flick solves the level on the phone`, async () => assert.equal((await until(s, (one) => one.screen === "end")).screen, "end"));
  await s.shot("12-flick-solved");
}

async function steps(s, { check, label }) {
  await solveLevel(s, { check, label });
  await s.tap("home");
  await s.tap("looks");
  await s.shot("9-robots");
  await s.tap("tab", "world");
  await s.shot("9-worlds");
  await s.tap("done");
  await makeLevel(s, { check, label, flick: label.endsWith("-flick") });
  if ((await stateOf(s)).screen === "play") await s.tap("pause");
  await s.tap("home");
  await s.tap("avatar", undefined, PICK_SCREEN_OVERFLOWS_THE_SMALLEST_ROOM);
  await s.shot("13-avatar");
}

async function robotPixel(s) {
  const spot = await s.evaluate(() => {
    const { round, layout } = document.getElementById("view").game.state;
    const { board } = layout;
    const { at } = round.level.start;
    return { x: board.x + ((at % board.size) + 0.5) * board.cell, y: board.y + (Math.floor(at / board.size) + 0.5) * board.cell, cell: board.cell };
  });
  const pixels = await s.samples({ x: spot.x - spot.cell * 0.3, y: spot.y - spot.cell * 0.3, w: spot.cell * 0.6, h: spot.cell * 0.6 }, 2);
  return Math.max(...pixels.map((pixel) => toneOf(pixel)[1]));
}

async function playScreen(s, { check, label, theme }) {
  await s.tap("play");
  await s.evaluate(() => (document.getElementById("view").game.state.hint = null));
  await s.page.waitForTimeout(400);
  await s.shot("play");
  const shares = toneShares(await s.samples());
  const chroma = await robotPixel(s);
  console.log(`${label}: L>=0.8 ${shares.bright}%, L>=0.6 ${shares.light}%, L 0.35-0.55 ${shares.mid}%, vivid ${shares.vivid}%; robot chroma ${chroma.toFixed(3)}`);
  await check(`${label}: the robot keeps its full colour`, async () => assert.ok(chroma >= 0.09, `the robot's chroma is ${chroma.toFixed(3)}`));
  if (!theme.name.endsWith("-dark")) return;
  await check(`${label}: little of the screen is bright in a dark conversation`, async () => assert.ok(shares.bright < 20, `${shares.bright}% at L>=0.8`));
}

await walkCanvasGame({
  game: "beeproute",
  out: OUT,
  modes: [
    { name: "flick", fill: true, query: "&solo" },
    { name: "alone", fill: false, query: "&alone", engines: ["chromium"] },
  ],
  steps,
  themes: ["mono-dark", "mono-light", "ember-dark"].map((name) => ({ name, query: "&solo", run: playScreen })),
});

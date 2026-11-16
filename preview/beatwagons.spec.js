import assert from "node:assert/strict";
import { toneOf, toneShares, walkCanvasGame } from "./canvas-walk.js";

const OUT = "/private/tmp/ftgames-beatwagons-shots";

const stateOf = (s) =>
  s.evaluate(() => {
    const { screen, round, build } = document.getElementById("view").game.state;
    const open = round ? round.puzzle.placed.flatMap((wagon, at) => (wagon === null ? [at] : [])) : [];
    const wanted = round && open.length ? round.puzzle.train.wagons[open[0]] : null;
    return {
      screen,
      phase: round?.phase ?? null,
      at: round?.at ?? null,
      driver: round?.driver ?? null,
      wrongs: round?.wrongs ?? 0,
      busy: Boolean(round?.flying || round?.back),
      open: open.length,
      right: round ? round.candidates.indexOf(wanted) : -1,
      wrong: round ? round.candidates.findIndex((wagon) => wagon !== wanted) : -1,
      built: build ? build.wagons.length : 0,
      sendable: build ? build.check.ok : null,
    };
  });

async function until(s, test, { limit = 60_000, step = 150 } = {}) {
  for (let waited = 0; waited < limit; waited += step) {
    const seen = await stateOf(s);
    if (test(seen)) return seen;
    await s.page.waitForTimeout(step);
  }
  return stateOf(s);
}

async function tapAt(s, kind, index) {
  const found = (await s.targets()).find((one) => one.kind === kind && one.value[0] === index);
  assert.ok(found, `no ${kind} ${index} to tap`);
  await s.page.mouse.click(...(await s.at(found.x + found.w / 2, found.y + found.h / 2)));
  await s.page.waitForTimeout(250);
  s.outside.push(...(await s.misplaced()));
}

const standing = (seen) => seen.phase === "solve" && !seen.busy;

async function completeTrain(s) {
  let seen = await until(s, standing);
  while (seen.phase === "solve" && seen.open) {
    await tapAt(s, "candidate", seen.right);
    seen = await until(s, (one) => one.phase !== "solve" || !one.busy);
  }
}

async function playRound(s, { check, label }) {
  await s.tap("play");
  await s.shot("2-arriving");
  const first = await until(s, standing);
  await s.shot("3-hint");
  await tapAt(s, "candidate", first.wrong);
  await s.page.waitForTimeout(450);
  await s.shot("4-wrong-wagon");
  await check(`${label}: a wagon that does not fit is no failure screen, it rolls back to the siding`, async () => {
    const seen = await until(s, standing);
    assert.deepEqual([seen.screen, seen.wrongs, seen.open > 0], ["play", 1, true]);
  });
  await s.tap("pause");
  await s.shot("5-pause");
  await s.tap("resume");
  await s.tap("speaker");
  await s.shot("6-volume");
  await s.tap("speaker");
  await completeTrain(s);
  await s.page.waitForTimeout(900);
  await s.shot("7-tune");
  await check(`${label}: the finished train plays its tune and the next one rolls in`, async () => assert.equal((await until(s, (seen) => seen.at === 1)).at, 1));
  await completeTrain(s);
  await until(s, (seen) => seen.at === 2);
  await completeTrain(s);
  await check(`${label}: the round of three trains ends on the star screen`, async () => assert.equal((await until(s, (seen) => seen.screen === "end")).screen, "end"));
  await s.page.waitForTimeout(600);
  await s.shot("8-end");
}

async function composeTrain(s, { check, label, flick }) {
  await s.tap("variant", "make");
  await s.tap("play");
  await check(`${label}: composing opens the empty train and the eight wagons`, async () => assert.equal((await stateOf(s)).screen, "build"));
  await tapAt(s, "dots", "dots");
  for (const kind of [0, 1, 0, 1, 0, 1]) await tapAt(s, "wagon", kind);
  if (flick) await tapAt(s, "slot", 3);
  await s.shot("10-compose");
  await check(`${label}: six wagons are coupled${flick ? " and the train with one hidden can go" : ""}`, async () => {
    const seen = await stateOf(s);
    assert.deepEqual([seen.built, seen.sendable], [6, flick]);
  });
  await s.tap("send");
  if (!flick) {
    await s.page.waitForTimeout(700);
    await s.shot("11-own-tune");
    await check(`${label}: alone, the train plays where it stands`, async () => assert.equal((await stateOf(s)).screen, "build"));
    return;
  }
  await check(`${label}: the train made is completed by Flick`, async () => assert.deepEqual([(await stateOf(s)).screen, (await stateOf(s)).driver], ["play", "flick"]));
  await until(s, (seen) => seen.phase === "solve");
  await s.page.waitForTimeout(1300);
  await s.shot("11-flick-completing");
  await check(`${label}: Flick finishes the train on the phone`, async () => assert.equal((await until(s, (seen) => seen.screen === "end")).screen, "end"));
  await s.shot("12-flick-done");
}

async function steps(s, { check, label }) {
  await playRound(s, { check, label });
  await s.tap("home");
  await s.tap("looks");
  await s.shot("9-engines");
  await s.tap("tab", "scenery");
  await s.shot("9-stations");
  await s.tap("done");
  await composeTrain(s, { check, label, flick: label.endsWith("-flick") });
  if ((await stateOf(s)).screen !== "end") await s.tap("pause");
  await s.tap("home");
  await s.tap("avatar");
  await s.shot("13-avatar");
}

async function wagonChroma(s) {
  const spot = await s.evaluate(() => {
    const { train } = document.getElementById("view").game.state.layout;
    return { x: train.xs[0], y: train.y, size: train.size };
  });
  const pixels = await s.samples({ x: spot.x - spot.size * 0.3, y: spot.y - spot.size * 0.3, w: spot.size * 0.6, h: spot.size * 0.6 }, 2);
  return Math.max(...pixels.map((pixel) => toneOf(pixel)[1]));
}

async function playScreen(s, { check, label, theme }) {
  await s.tap("play");
  await until(s, standing);
  await s.evaluate(() => (document.getElementById("view").game.state.hint = null));
  await s.page.waitForTimeout(300);
  await s.shot("play");
  const shares = toneShares(await s.samples());
  const chroma = await wagonChroma(s);
  console.log(`${label}: L>=0.8 ${shares.bright}%, L>=0.6 ${shares.light}%, L 0.35-0.55 ${shares.mid}%, vivid ${shares.vivid}%; wagon chroma ${chroma.toFixed(3)}`);
  await check(`${label}: the wagons keep their full colour`, async () => assert.ok(chroma >= 0.09, `the wagon's chroma is ${chroma.toFixed(3)}`));
  if (!theme.name.endsWith("-dark")) return;
  await check(`${label}: little of the screen is bright in a dark conversation`, async () => assert.ok(shares.bright < 20, `${shares.bright}% at L>=0.8`));
}

await walkCanvasGame({
  game: "beatwagons",
  out: OUT,
  modes: [
    { name: "flick", fill: true, query: "&solo" },
    { name: "alone", fill: false, query: "&alone", engines: ["chromium"] },
  ],
  steps,
  themes: ["mono-dark", "mono-light", "ember-dark"].map((name) => ({ name, query: "&solo", run: playScreen })),
});

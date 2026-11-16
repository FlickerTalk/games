import assert from "node:assert/strict";
import { toneOf, toneShares, walkCanvasGame } from "./canvas-walk.js";

const OUT = "/private/tmp/ftgames-shardsplitter-shots";
const PICK_SCREEN_OVERFLOWS_THE_SMALLEST_ROOM = { inside: false };

const stateOf = (s) =>
  s.evaluate(() => {
    const { screen, round, outcome } = document.getElementById("view").game.state;
    if (!round) return { screen, playing: false };
    const { core, mySide } = round;
    const golem = core.golems[core.at] ?? null;
    const mine = core.hands[mySide];
    const fits = (divisor) => !core.over && divisor !== golem.cap && core.value % divisor === 0;
    const theirs = (core.hands[1 - mySide] ?? []).some(fits);
    const myTurn = !core.over && mine.some(fits) && (!theirs || (core.last === null ? core.at % 2 === mySide : core.last !== mySide));
    return {
      screen,
      playing: true,
      kind: round.kind,
      value: core.value,
      count: core.count,
      at: core.at,
      clinks: core.clinks.reduce((sum, one) => sum + one, 0),
      hits: round.hits.length,
      fitting: mine.filter(fits),
      unfitting: mine.filter((divisor) => !fits(divisor)),
      myTurn,
      busy: performance.now() < round.busyUntil,
      stars: outcome?.stars ?? null,
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

const ready = (s) => until(s, (seen) => seen.screen !== "play" || (seen.myTurn && !seen.busy));

async function hit(s, divisor) {
  const found = (await s.targets()).find((one) => one.kind === "hit" && one.value[0] === divisor);
  assert.ok(found, `no divisor ${divisor} to hit`);
  await s.page.mouse.click(...(await s.at(found.x + found.w / 2, found.y + found.h / 2)));
}

async function clink(s, seen, { check, label }) {
  await hit(s, seen.unfitting[0]);
  await s.page.waitForTimeout(260);
  await s.shot("3-clink");
  await check(`${label}: a divisor that does not divide clinks off, with no failure screen`, async () => {
    const now = await stateOf(s);
    assert.deepEqual([now.screen, now.clinks, now.value], ["play", 1, seen.value]);
  });
}

async function playRound(s, { check, label }) {
  await s.tap("play");
  await check(`${label}: the play button opens a round`, async () => assert.equal((await stateOf(s)).screen, "play"));
  await s.shot("2-hint");
  const before = await ready(s);
  await hit(s, before.fitting[0]);
  await s.page.waitForTimeout(420);
  await s.shot("4-split");
  await check(`${label}: a divisor that divides splits the golem at once`, async () => assert.equal((await stateOf(s)).hits, before.hits + 1));
  await s.tap("pause");
  await s.shot("5-pause");
  await s.tap("resume");
  await s.tap("speaker");
  await s.shot("6-volume");
  await s.tap("speaker");
  let shot = false;
  let clinked = false;
  for (let turn = 0; turn < 80; turn += 1) {
    let seen = await ready(s);
    if (seen.screen !== "play") break;
    if (!clinked && seen.unfitting.length) {
      await clink(s, seen, { check, label });
      clinked = true;
      seen = await ready(s);
    }
    if (!shot && seen.count >= 4) {
      await s.shot("7-many");
      shot = true;
    }
    await hit(s, seen.fitting[0]);
    await s.page.waitForTimeout(120);
  }
  await check(`${label}: the round ends on the star screen`, async () => assert.equal((await until(s, (seen) => seen.screen === "end")).screen, "end"));
  await s.page.waitForTimeout(700);
  await s.shot("8-end");
}

async function steps(s, { check, label }) {
  await playRound(s, { check, label });
  await s.tap("home");
  await s.tap("looks");
  await s.shot("9-mallets");
  await s.tap("tab", "place");
  await s.shot("9-places");
  await s.tap("done");
  await s.tap("avatar", undefined, PICK_SCREEN_OVERFLOWS_THE_SMALLEST_ROOM);
  await s.shot("10-avatar");
}

async function golemChroma(s) {
  const spot = await s.evaluate(() => {
    const { field } = document.getElementById("view").game.state.layout;
    return { x: field.x + field.w / 2, y: field.y + field.h, size: Math.min(150, field.w * 0.9, field.h) };
  });
  const pixels = await s.samples({ x: spot.x - spot.size * 0.45, y: spot.y - spot.size * 0.95, w: spot.size * 0.9, h: spot.size * 0.5 }, 2);
  return Math.max(...pixels.map((pixel) => toneOf(pixel)[1]));
}

async function playScreen(s, { check, label, theme }) {
  await s.tap("play");
  await ready(s);
  await s.evaluate(() => (document.getElementById("view").game.state.hint = null));
  await s.page.waitForTimeout(300);
  await s.shot("play");
  const shares = toneShares(await s.samples());
  const chroma = await golemChroma(s);
  console.log(`${label}: L>=0.8 ${shares.bright}%, L>=0.6 ${shares.light}%, L 0.35-0.55 ${shares.mid}%, vivid ${shares.vivid}%; golem chroma ${chroma.toFixed(3)}`);
  await check(`${label}: the golem keeps its full colour`, async () => assert.ok(chroma >= 0.07, `the golem's chroma is ${chroma.toFixed(3)}`));
  if (!theme.name.endsWith("-dark")) return;
  await check(`${label}: little of the screen is bright in a dark conversation`, async () => assert.ok(shares.bright < 20, `${shares.bright}% at L>=0.8`));
}

await walkCanvasGame({
  game: "shardsplitter",
  out: OUT,
  modes: [
    { name: "flick", fill: true, query: "&solo" },
    { name: "alone", fill: false, query: "&alone", engines: ["chromium"] },
  ],
  steps,
  themes: ["mono-dark", "mono-light", "ember-dark"].map((name) => ({ name, query: "&solo", run: playScreen })),
});

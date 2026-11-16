import assert from "node:assert/strict";
import { toneOf, toneShares, walkCanvasGame } from "./canvas-walk.js";

const OUT = "/private/tmp/ftgames-squarehop-shots";
const PICK_SCREEN_OVERFLOWS_THE_SMALLEST_ROOM = { inside: false };

const stateOf = (s) =>
  s.evaluate(() => {
    const { game } = document.getElementById("view");
    const { screen, round, outcome } = game.state;
    return {
      screen,
      kind: round?.kind ?? null,
      at: round ? [...round.race.at] : null,
      picks: round ? round.picks.length : 0,
      moving: Boolean(round?.move),
      open: game.targets().some((one) => one.kind === "die"),
      outcome: outcome ? { won: outcome.won, mine: outcome.mine, theirs: outcome.theirs, stars: outcome.stars } : null,
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

const nearTheFinish = (s) =>
  s.evaluate(() => {
    const { round } = document.getElementById("view").game.state;
    round.race = { ...round.race, at: round.race.at.map((square, side) => (side === round.me ? 26 : 17)) };
  });

async function race(s, { check, label }) {
  await s.tap("play");
  const ready = await until(s, (seen) => seen.open);
  await s.shot("2-hint");
  await check(`${label}: both pieces start on square 1 and the dice wait for a touch`, async () => assert.deepEqual([ready.screen, ready.at, ready.open], ["play", [1, 1], true]));
  await s.tap("die", 0);
  await s.page.waitForTimeout(500);
  await s.shot("3-hopping");
  const hopped = await until(s, (seen) => seen.open);
  await check(`${label}: the chosen die moves the piece, and the turn comes back`, async () => {
    assert.ok(hopped.at[0] > 1, `still on ${hopped.at[0]}`);
    assert.ok(hopped.picks >= 2 || hopped.kind === "pair", `${hopped.picks} picks`);
  });
  await s.shot("4-turn");
  await s.tap("pause");
  await s.shot("5-pause");
  await s.tap("resume");
  await s.tap("speaker");
  await s.shot("6-volume");
  await s.tap("speaker");
  await until(s, (seen) => seen.open);
  await nearTheFinish(s);
  for (let turns = 0; turns < 12; turns += 1) {
    const seen = await until(s, (one) => one.open || one.screen === "end");
    if (seen.screen === "end") break;
    await s.tap("die", 1);
  }
  const ended = await until(s, (seen) => seen.screen === "end");
  await check(`${label}: a piece reaches square 30 and the round ends on the star card`, async () => {
    assert.equal(ended.screen, "end");
    assert.equal(Math.max(ended.outcome.mine, ended.outcome.theirs), 30);
  });
  await s.page.waitForTimeout(600);
  await s.shot("7-end");
}

async function steps(s, { check, label }) {
  if (label.endsWith("-alone")) {
    await s.tap("variant", "pair");
    await s.shot("1-pair");
  }
  await race(s, { check, label });
  if (label.endsWith("-alone")) await check(`${label}: two on one phone get no stars`, async () => assert.equal((await stateOf(s)).outcome.stars, null));
  await s.tap("home");
  await s.tap("looks");
  await s.shot("8-tracks");
  await s.tap("tab", "dice");
  await s.shot("9-dice");
  await s.tap("done");
  await s.tap("avatar", undefined, PICK_SCREEN_OVERFLOWS_THE_SMALLEST_ROOM);
  await s.shot("10-avatar");
}

async function piecePixel(s) {
  const spot = await s.evaluate(() => {
    const { track } = document.getElementById("view").game.state.layout;
    return { x: track.x + track.cell * 0.5 - track.cell * 0.22, y: track.y + track.cell * 0.5, cell: track.cell };
  });
  const pixels = await s.samples({ x: spot.x - spot.cell * 0.45, y: spot.y - spot.cell * 0.45, w: spot.cell * 0.9, h: spot.cell * 0.9 }, 2);
  return Math.max(...pixels.map((pixel) => toneOf(pixel)[1]));
}

async function playScreen(s, { check, label, theme }) {
  await s.tap("play");
  await until(s, (seen) => seen.open);
  await s.evaluate(() => (document.getElementById("view").game.state.hint = false));
  await s.page.waitForTimeout(300);
  await s.shot("play");
  const shares = toneShares(await s.samples());
  const chroma = await piecePixel(s);
  console.log(`${label}: L>=0.8 ${shares.bright}%, L>=0.6 ${shares.light}%, L 0.35-0.55 ${shares.mid}%, vivid ${shares.vivid}%; piece chroma ${chroma.toFixed(3)}`);
  await check(`${label}: the pieces keep their full colour`, async () => assert.ok(chroma >= 0.09, `the piece's chroma is ${chroma.toFixed(3)}`));
  if (!theme.name.endsWith("-dark")) return;
  await check(`${label}: little of the screen is bright in a dark conversation`, async () => assert.ok(shares.bright < 20, `${shares.bright}% at L>=0.8`));
}

await walkCanvasGame({
  game: "squarehop",
  out: OUT,
  modes: [
    { name: "flick", fill: true, query: "&solo" },
    { name: "flick", fill: false, query: "&solo", engines: ["chromium"] },
    { name: "alone", fill: false, query: "&alone", engines: ["chromium"] },
  ],
  steps,
  themes: ["mono-dark", "mono-light", "ember-dark"].map((name) => ({ name, query: "&solo", run: playScreen })),
});

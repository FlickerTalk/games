import assert from "node:assert/strict";
import { toneShares, walkCanvasGame } from "./canvas-walk.js";

const OUT = "/private/tmp/ftgames-painttanks-shots";
const FIELDS = ["land", "sea", "coast", "deep"];
const PICK_SCREEN_OVERFLOWS_THE_SMALLEST_ROOM = { inside: false };


const waitTurn = (s) =>
  s.evaluate(async () => {
    const game = document.getElementById("view").game;
    for (let step = 0; step < 200 && !game.myTurn(); step += 1) await new Promise((resolve) => setTimeout(resolve, 50));
    return game.myTurn();
  });

const hurry = (s) =>
  s.evaluate(async () => {
    const game = document.getElementById("view").game;
    for (let step = 0; step < 600 && game.state.screen === "play"; step += 1) {
      const { round } = game.state;
      if (round.flight) round.flight.start = -1e9;
      if (round.flickAt !== null) round.flickAt = 0;
      if (Number.isFinite(round.endAt)) round.endAt = 0;
      round.settledAt = 0;
      if (game.myTurn()) game.press(game.targets().find((one) => one.kind === "fire"));
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    await game.idle();
    return game.state.screen;
  });

async function pull(s, { release }) {
  const [x, y] = await s.evaluate(() => document.getElementById("view").game.anchorOnScreen());
  await s.page.mouse.move(...(await s.at(x - 8, y + 8)));
  await s.page.mouse.down();
  await s.page.mouse.move(...(await s.at(x - 58, y + 62)), { steps: 6 });
  if (release) await s.page.mouse.up();
  await s.page.waitForTimeout(120);
}

async function steps(s, { check, label }) {
  await s.tap("play");
  await check(`${label}: the player's turn comes`, async () => assert.equal(await waitTurn(s), true));
  await s.shot("2-hint");
  await pull(s, { release: false });
  await s.shot("3-aiming");
  await s.page.mouse.up();
  await s.page.waitForTimeout(500);
  await s.shot("4-flight");
  await check(`${label}: letting go shoots`, async () => assert.ok((await s.evaluate(() => document.getElementById("view").game.state.round.moves.length)) >= 2, "no shot"));
  await s.page.waitForTimeout(2600);
  await s.shot("5-landed");
  await s.tap("pause");
  await s.shot("6-pause");
  await s.tap("resume");
  await s.tap("speaker");
  await s.shot("7-volume");
  await s.tap("speaker");
  await check(`${label}: a round ends on the star screen`, async () => assert.equal(await hurry(s), "end"));
  await s.page.waitForTimeout(400);
  await s.shot("8-end");
  await s.tap("home");
  await s.tap("looks");
  await s.shot("9-looks");
  await s.tap("look", 2);
  await s.shot("10-submarines");
  await s.tap("done");
  await s.tap("done");
  await s.tap("avatar", undefined, PICK_SCREEN_OVERFLOWS_THE_SMALLEST_ROOM);
  await s.shot("11-avatar");
}

async function fields(s, { check, label, theme }) {
  for (const field of FIELDS) {
    await s.tap("variant", field);
    await s.tap("play");
    await waitTurn(s);
    await s.evaluate(() => (document.getElementById("view").game.state.taught = true));
    await s.page.waitForTimeout(300);
    await s.shot(`play-${field}`);
    const shares = toneShares(await s.samples());
    console.log(`${label} ${field}: L>=0.8 ${shares.bright}%, L>=0.6 ${shares.light}%, L 0.35-0.55 ${shares.mid}%, vivid ${shares.vivid}%`);
    if (theme.name.endsWith("-dark")) await check(`${label} ${field}: little of a dark page's play screen is bright`, async () => assert.ok(shares.bright < 12, `${shares.bright}% at L>=0.8`));
    await s.tap("pause");
    await s.tap("home");
  }
}


await walkCanvasGame({
  game: "painttanks",
  out: OUT,
  modes: [
    { name: "flick", fill: true, query: "&solo" },
    { name: "alone", fill: false, query: "&alone", engines: ["chromium"] },
  ],
  steps,
  themes: ["mono-dark", "mono-light", "ember-dark"].map((name) => ({ name, query: "&solo", run: fields })),
});

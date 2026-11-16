import assert from "node:assert/strict";
import { toneShares, walkCanvasGame } from "./canvas-walk.js";

const OUT = "/private/tmp/ftgames-painttanks-shots";
const FIELDS = ["land", "sea", "coast", "deep"];

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

const other = (s) => s.page.frames().find((one) => one.url().endsWith("/b/frame.html"));

const pressOn = (frame, kind) =>
  frame.evaluate(async (wanted) => {
    const game = document.getElementById("view").game;
    const found = game.targets().find((one) => one.kind === wanted);
    if (found) game.press(found);
    await game.idle();
    return Boolean(found);
  }, kind);

const roundOn = (frame) =>
  frame.evaluate(() => {
    const game = document.getElementById("view").game;
    return { screen: game.state.screen, turn: game.myTurn(), shots: game.state.round?.states.length ?? 0, side: game.state.round?.mySide ?? null };
  });

async function friends(s, { check, label }) {
  await s.page.evaluate(() => globalThis.harness.open("b"));
  await s.page.frameLocator("#frame-b").locator("canvas").waitFor();
  await s.page.waitForTimeout(400);
  await s.tap("play");
  await s.page.waitForTimeout(600);
  await s.shot("2-calling");
  await pressOn(other(s), "accept");
  await pressOn(other(s), "play");
  await s.page.waitForTimeout(2500);
  const [mine, theirs] = [await roundOn(s.inner()), await roundOn(other(s))];
  await check(`${label}: both phones are in the same battle, on opposite sides, one of them to shoot`, async () => {
    assert.deepEqual([mine.screen, theirs.screen], ["play", "play"]);
    assert.deepEqual([mine.side, theirs.side].sort(), [0, 1]);
    assert.equal(mine.turn !== theirs.turn, true, `turns ${mine.turn} ${theirs.turn}`);
  });
  await pressOn(mine.turn ? s.inner() : other(s), "fire");
  await s.page.waitForTimeout(1200);
  await s.shot("3-shot");
  await s.page.waitForTimeout(3500);
  await check(`${label}: a shot is seen on both phones`, async () => {
    const seen = [await roundOn(s.inner()), await roundOn(other(s))];
    assert.deepEqual(seen.map((one) => one.shots), [2, 2]);
    assert.equal(seen[0].turn !== seen[1].turn, true);
  });
  await s.shot("4-answer");
  await s.page.locator("#frame-b").screenshot({ path: `${s.out}/5-other-phone.png` });
}

async function steps(s, context) {
  if (context.label.endsWith("-friend")) return friends(s, context);
  const { check, label } = context;
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
  await s.tap("avatar");
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
    { name: "friend", fill: true, query: "" },
  ],
  steps,
  themes: ["mono-dark", "mono-light", "ember-dark"].map((name) => ({ name, query: "&solo", run: fields })),
});

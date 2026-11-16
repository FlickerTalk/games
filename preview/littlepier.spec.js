import assert from "node:assert/strict";
import { toneShares, walkCanvasGame } from "./canvas-walk.js";

const OUT = "/private/tmp/ftgames-littlepier-shots";
const DEPTH = 0.3;

const game = (s, run, arg) => s.evaluate(run, arg);

const sendOneFish = (s) =>
  game(
    s,
    (depth) => {
      const { state } = document.getElementById("view").game;
      const { round } = state;
      const lead = depth / 0.45;
      const swim = (0.4 + 0.14) / round.pace;
      state.round = { ...round, visitors: [{ id: 0, kind: 6, depth, speed: 1, direction: 1, enter: round.time + lead - swim }] };
    },
    DEPTH,
  );

async function holdWater(s) {
  const water = (await s.targets()).find((one) => one.kind === "water");
  await s.page.mouse.move(...(await s.at(water.x + water.w / 2, water.y + water.h * 0.6)));
  await s.page.mouse.down();
}

const caught = (s) => game(s, () => document.getElementById("view").game.state.round.caught[0].length);

const finish = (s) =>
  game(s, async () => {
    const view = document.getElementById("view").game;
    view.state.round = { ...view.state.round, time: view.state.round.seconds - 0.3 };
    await new Promise((resolve) => setTimeout(resolve, 2600));
    await view.idle();
    return view.state.screen;
  });

async function fish(s, { check, label }) {
  await sendOneFish(s);
  await holdWater(s);
  await s.page.waitForTimeout(1000);
  await s.shot("3-bite");
  await s.page.mouse.up();
  await s.page.waitForTimeout(750);
  await s.shot("4-landed");
  await check(`${label}: holding the water with the mouse lands the fish that bit`, async () => assert.equal(await caught(s), 1));
  await s.page.waitForTimeout(900);
  await s.shot("5-sticker");
}

async function steps(s, { check, label }) {
  await s.tap("play");
  await s.shot("2-hint");
  await fish(s, { check, label });
  await s.tap("pause");
  await s.shot("6-pause");
  await s.tap("resume");
  await s.tap("speaker");
  await s.shot("7-volume");
  await s.tap("speaker");
  await check(`${label}: a round ends on the star screen`, async () => assert.equal(await finish(s), "end"));
  await s.shot("8-end");
  await s.tap("home");
  await s.tap("variant", "album");
  await s.shot("9-album");
  await s.tap("done");
  await s.tap("looks");
  await s.shot("10-charms");
  await s.tap("tab", "place");
  await s.shot("11-places");
  await s.tap("done");
  await s.tap("avatar");
  await s.shot("12-avatar");
}

async function playScreen(s, { check, label, theme }) {
  await s.tap("play");
  await game(s, () => (document.getElementById("view").game.state.hint = false));
  await s.page.waitForTimeout(2500);
  await s.shot("play");
  const shares = toneShares(await s.samples());
  console.log(`${label}: L>=0.8 ${shares.bright}%, L>=0.6 ${shares.light}%, L 0.35-0.55 ${shares.mid}%, vivid ${shares.vivid}%`);
  if (!theme.name.endsWith("-dark")) return;
  await check(`${label}: little of the screen is bright on a dark page`, async () => assert.ok(shares.bright < 12, `${shares.bright}% at L>=0.8`));
}

await walkCanvasGame({
  game: "littlepier",
  out: OUT,
  modes: [
    { name: "flick", fill: true, query: "&solo" },
    { name: "alone", fill: false, query: "&alone", engines: ["chromium"] },
  ],
  steps,
  themes: ["mono-dark", "mono-light", "ember-dark"].map((name) => ({ name, query: "&solo", run: playScreen })),
});

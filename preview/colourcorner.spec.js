import assert from "node:assert/strict";
import { toneOf, toneShares, walkCanvasGame } from "./canvas-walk.js";

const OUT = "/private/tmp/ftgames-colourcorner-shots";
const PICK_SCREEN_OVERFLOWS_THE_SMALLEST_ROOM = { inside: false };

const stateOf = (s) =>
  s.evaluate(() => {
    const { state } = document.getElementById("view").game;
    return { screen: state.screen, page: state.page, fills: Object.keys(state.work.fills).length, items: state.drawing.items.length, wall: state.wall.length };
  });

const fillRest = (s) =>
  s.evaluate(async () => {
    const game = document.getElementById("view").game;
    for (const zone of game.targets().filter((one) => one.kind === "zone")) {
      if (game.state.work.fills[zone.value] !== undefined) continue;
      const point = { x: zone.x + zone.w / 2, y: zone.y + zone.h / 2 };
      game.pointer({ type: "down", ...point });
      game.pointer({ type: "up", ...point });
      await game.idle();
    }
    await new Promise((resolve) => setTimeout(resolve, 1800));
    await game.idle();
    return game.state.screen;
  });

const paintWithFlick = (s) =>
  s.evaluate(async () => {
    const game = document.getElementById("view").game;
    const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    let theirs = 0;
    for (let waited = 0; waited < 90_000 && game.state.screen !== "picture"; waited += 50) {
      await pause(50);
      await game.idle();
      theirs += game.state.spreads.some((one) => one.by === "them") ? 1 : 0;
      if (game.state.screen === "shelf") {
        const tile = game.targets().find((one) => one.kind === "tile" && one.value === "flower");
        if (tile) game.press(tile);
        continue;
      }
      if (game.state.screen !== "duo" || !game.duo.status.myTurn || game.state.endAt !== null) continue;
      const fills = game.duo.status.state.fills;
      const zone = game.targets().find((one) => one.kind === "zone" && fills[one.value] === undefined);
      if (!zone) continue;
      const point = { x: zone.x + zone.w / 2, y: zone.y + zone.h / 2 };
      game.pointer({ type: "down", ...point });
      game.pointer({ type: "up", ...point });
    }
    return { screen: game.state.screen, kind: game.state.picture?.kind, theirs };
  });

async function stroke(s) {
  const page = await s.evaluate(() => document.getElementById("view").game.state.layout.page);
  const at = (x, y) => s.at(page.x + page.w * x, page.y + page.h * y);
  await s.page.mouse.move(...(await at(0.2, 0.3)));
  await s.page.mouse.down();
  await s.page.mouse.move(...(await at(0.4, 0.6)), { steps: 6 });
  await s.page.mouse.move(...(await at(0.45, 0.25)), { steps: 6 });
  await s.page.mouse.up();
  await s.page.waitForTimeout(200);
}

async function colourPage(s, { check, label }) {
  await s.tap("variant", "pages");
  await s.tap("play");
  await s.shot("2-shelf");
  await s.tap("tile", "cat");
  await s.page.waitForTimeout(700);
  await s.shot("3-hint");
  await s.tap("zone");
  await s.page.waitForTimeout(200);
  await s.shot("4-spreading");
  await check(`${label}: a touched part of the page takes the paint`, async () => assert.equal((await stateOf(s)).fills, 1));
  await s.tap("speaker");
  await s.shot("5-volume");
  await s.tap("speaker");
  await check(`${label}: a page coloured in full is framed and hung in the gallery`, async () => {
    assert.equal(await fillRest(s), "picture");
    assert.equal((await stateOf(s)).wall, 1);
  });
  await s.shot("6-framed");
  await s.page.waitForTimeout(2600);
  await s.shot("7-picture");
  await s.tap("home");
}

async function paintFreely(s, { check, label }) {
  await s.tap("variant", "free");
  await s.tap("play");
  await stroke(s);
  await check(`${label}: a finger dragged over the paper leaves a line`, async () => assert.equal((await stateOf(s)).items, 1));
  await s.shot("8-free");
  await s.tap("done");
  await s.page.waitForTimeout(2600);
  await s.tap("home");
  await s.tap("looks");
  await s.page.waitForTimeout(300);
  await s.shot("9-gallery");
  await s.tap("back");
}

async function steps(s, { check, label }) {
  await colourPage(s, { check, label });
  await paintFreely(s, { check, label });
  if (label.endsWith("-flick")) {
    await s.tap("variant", "together");
    await s.tap("play");
    await s.page.waitForTimeout(1500);
    await s.shot("10-together");
    await check(`${label}: a page painted in turns with Flick ends framed`, async () => {
      const end = await paintWithFlick(s);
      assert.equal(end.screen, "picture");
      assert.equal(end.kind, "shared");
      assert.ok(end.theirs > 0, "Flick never painted");
    });
    await s.shot("11-shared");
    await s.tap("home");
  }
  await s.tap("avatar", undefined, PICK_SCREEN_OVERFLOWS_THE_SMALLEST_ROOM);
  await s.shot("12-avatar");
}

async function pageScreen(s, { check, label, theme }) {
  await s.tap("variant", "pages");
  await s.tap("play");
  await s.tap("tile", "cat");
  const painted = await s.evaluate(async () => {
    const game = document.getElementById("view").game;
    const zones = game.targets().filter((one) => one.kind === "zone").slice(0, 6);
    for (const zone of zones) {
      const point = { x: zone.x + zone.w / 2, y: zone.y + zone.h / 2 };
      game.pointer({ type: "down", ...point });
      game.pointer({ type: "up", ...point });
      await game.idle();
    }
    game.state.taught = true;
    return zones.map((zone) => ({ x: zone.x + zone.w / 2 - 2, y: zone.y + zone.h / 2 - 2, w: 4, h: 4 }));
  });
  await s.page.waitForTimeout(900);
  await s.shot("page");
  const shares = toneShares(await s.samples());
  const chroma = [];
  for (const area of painted) chroma.push(...(await s.samples(area, 2)).map((pixel) => toneOf(pixel)[1]));
  const least = Math.min(...chroma);
  console.log(`${label}: L>=0.8 ${shares.bright}%, L>=0.6 ${shares.light}%, L 0.35-0.55 ${shares.mid}%, vivid ${shares.vivid}%; paint chroma ${least.toFixed(3)}-${Math.max(...chroma).toFixed(3)}`);
  await check(`${label}: the paint keeps its full colour`, async () => assert.ok(least >= 0.09, `a painted part's chroma is ${least.toFixed(3)}`));
  if (!theme.name.endsWith("-dark")) return;
  await check(`${label}: the paper is not a bright sheet in a dark chat`, async () => assert.ok(shares.bright < 25, `${shares.bright}% at L>=0.8`));
}

await walkCanvasGame({
  game: "colourcorner",
  out: OUT,
  modes: [
    { name: "flick", fill: true, query: "&solo" },
    { name: "alone", fill: false, query: "&alone", engines: ["chromium"] },
  ],
  steps,
  themes: ["mono-dark", "mono-light", "ember-dark"].map((name) => ({ name, query: "&alone", run: pageScreen })),
});

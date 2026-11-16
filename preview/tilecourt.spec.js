import assert from "node:assert/strict";
import { toneOf, toneShares, walkCanvasGame } from "./canvas-walk.js";

const OUT = "/private/tmp/ftgames-tilecourt-shots";
const APPROVED_BRIGHT_SHARE = 84.8;
const PICK_SCREEN_OVERFLOWS_THE_SMALLEST_ROOM = { inside: false };

const shapes = {
  single: [[0, 0]], "domino-h": [[0, 0], [1, 0]], "domino-v": [[0, 0], [0, 1]], "triple-h": [[0, 0], [1, 0], [2, 0]], "triple-v": [[0, 0], [0, 1], [0, 2]],
  "corner-nw": [[0, 0], [1, 0], [0, 1]], "corner-ne": [[0, 0], [1, 0], [1, 1]], "corner-sw": [[0, 0], [0, 1], [1, 1]], "corner-se": [[1, 0], [0, 1], [1, 1]],
  square: [[0, 0], [1, 0], [0, 1], [1, 1]], "four-h": [[0, 0], [1, 0], [2, 0], [3, 0]], "four-v": [[0, 0], [0, 1], [0, 2], [0, 3]],
  "tee-up": [[0, 0], [1, 0], [2, 0], [1, 1]], "tee-right": [[1, 0], [0, 1], [1, 1], [1, 2]], "tee-down": [[1, 0], [0, 1], [1, 1], [2, 1]], "tee-left": [[0, 0], [0, 1], [1, 1], [0, 2]],
  "ell-up": [[0, 0], [1, 0], [0, 1], [0, 2]], "ell-right": [[0, 0], [1, 0], [2, 0], [2, 1]], "ell-down": [[1, 0], [1, 1], [0, 2], [1, 2]], "ell-left": [[0, 0], [0, 1], [1, 1], [2, 1]],
  "six-h": [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]], "six-v": [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]],
  "pee-h": [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2]], "pee-v": [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1]], "you-h": [[0, 0], [2, 0], [0, 1], [1, 1], [2, 1]], "you-v": [[0, 0], [1, 0], [0, 1], [0, 2], [1, 2]],
};
const pieces = Object.fromEntries(Object.entries(shapes).map(([id, cells]) => [id, { cells, width: Math.max(...cells.map(([x]) => x)) + 1, height: Math.max(...cells.map(([, y]) => y)) + 1 }]));

async function dragFirst(s, { release = true } = {}) {
  const plan = await s.evaluate(() => {
    const { round, layout } = document.getElementById("view").game.state;
    const slot = round.slots.findIndex(Boolean);
    const zone = layout.slots[slot];
    const { court } = layout;
    const width = window.__tilePieces[round.slots[slot]].width;
    return { from: [zone.x + zone.w / 2, zone.y + zone.h / 2], to: [court.x + court.cell * (1 + width / 2), court.y + court.cell * 3.5 + layout.lift] };
  });
  await s.page.mouse.move(...(await s.at(...plan.from)));
  await s.page.mouse.down();
  await s.page.mouse.move(...(await s.at(...plan.to)), { steps: 8 });
  if (release) await s.page.mouse.up();
  await s.page.waitForTimeout(250);
}

const finish = (s) =>
  s.evaluate(async () => {
    const game = document.getElementById("view").game;
    const fits = (cells, size, piece, at) => piece.every(([x, y]) => x + (at % size) < size && y + Math.floor(at / size) < size && cells[(Math.floor(at / size) + y) * size + (at % size) + x] === -1);
    for (let step = 0; step < 60 && game.state.screen === "play" && !game.state.round.over; step += 1) {
      const { round, layout } = game.state;
      const { court } = layout;
      const slot = round.slots.findIndex((id) => id && [...Array(court.size * court.size).keys()].some((at) => fits(round.court.cells, court.size, window.__tilePieces[id].cells, at)));
      if (slot < 0) break;
      const piece = window.__tilePieces[round.slots[slot]];
      const spot = [...Array(court.size * court.size).keys()].find((at) => fits(round.court.cells, court.size, piece.cells, at));
      const zone = layout.slots[slot];
      game.pointer({ type: "down", x: zone.x + zone.w / 2, y: zone.y + zone.h / 2 });
      const point = { x: court.x + ((spot % court.size) + piece.width / 2) * court.cell, y: court.y + (Math.floor(spot / court.size) + piece.height / 2) * court.cell + layout.lift };
      game.pointer({ type: "move", ...point });
      game.pointer({ type: "up", ...point });
      await game.idle();
    }
    await new Promise((resolve) => setTimeout(resolve, 3200));
    await game.idle();
    return game.state.screen;
  });

async function steps(s, { check, label }) {
  await s.tap("play");
  await s.shot("2-hint");
  await dragFirst(s, { release: false });
  await s.shot("3-carrying");
  await s.page.mouse.up();
  await s.page.waitForTimeout(150);
  await s.shot("4-laid");
  await check(`${label}: a dragged piece is laid with the mouse`, async () => {
    const laid = await s.evaluate(() => document.getElementById("view").game.state.round.placements.length);
    assert.ok(laid >= 1, "nothing laid");
  });
  await s.tap("pause");
  await s.shot("5-pause");
  await s.tap("resume");
  await s.tap("speaker");
  await s.shot("6-volume");
  await s.tap("speaker");
  await check(`${label}: a round ends on the star screen`, async () => assert.equal(await finish(s), "end"));
  await s.shot("7-end");
  await s.tap("home");
  await s.tap("looks");
  await s.shot("8-looks");
  await s.tap("tab", "effect");
  await s.shot("9-effects");
  await s.tap("done");
  await s.tap("avatar", undefined, PICK_SCREEN_OVERFLOWS_THE_SMALLEST_ROOM);
  await s.shot("10-avatar");
}

const trayPixels = (s) =>
  s.evaluate(() => {
    const canvas = document.querySelector("canvas");
    const ratio = canvas.width / canvas.getBoundingClientRect().width;
    const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    const { round, layout } = document.getElementById("view").game.state;
    const found = [];
    round.slots.forEach((id, at) => {
      if (!id) return;
      const piece = window.__tilePieces[id];
      const slot = layout.slots[at];
      const size = Math.min(layout.court.cell * 0.6, (slot.w - 32) / (piece.width + 0.4), (slot.h - 32) / (piece.height + 0.4));
      const left = slot.x + slot.w / 2 - (piece.width * size) / 2;
      const top = slot.y + slot.h / 2 - (piece.height * size) / 2;
      for (const [column, row] of piece.cells) {
        const offset = (Math.round((top + (row + 0.8) * size) * ratio) * canvas.width + Math.round((left + (column + 0.8) * size) * ratio)) * 4;
        found.push([data[offset], data[offset + 1], data[offset + 2]]);
      }
    });
    return found;
  });

async function playScreen(s, { check, label, theme }) {
  await s.tap("play");
  await s.evaluate(() => (document.getElementById("view").game.state.hint = null));
  await s.page.waitForTimeout(400);
  await s.shot("play");
  const shares = toneShares(await s.samples());
  const chroma = (await trayPixels(s)).map((pixel) => toneOf(pixel)[1]);
  const least = Math.min(...chroma);
  console.log(`${label}: L>=0.8 ${shares.bright}%, L>=0.6 ${shares.light}%, L 0.35-0.55 ${shares.mid}%, vivid ${shares.vivid}%; tray pieces chroma ${least.toFixed(3)}-${Math.max(...chroma).toFixed(3)}`);
  await check(`${label}: the pieces keep their full colour`, async () => assert.ok(least >= 0.09, `a piece's chroma is ${least.toFixed(3)}`));
  if (!theme.name.endsWith("-dark")) return;
  await check(`${label}: far less of the screen is bright than the approved look's ${APPROVED_BRIGHT_SHARE}%`, async () => assert.ok(shares.bright < APPROVED_BRIGHT_SHARE / 4, `${shares.bright}% at L>=0.8`));
}

await walkCanvasGame({
  game: "tilecourt",
  out: OUT,
  modes: [
    { name: "flick", fill: true, query: "&solo" },
    { name: "alone", fill: false, query: "&alone", engines: ["chromium"] },
  ],
  setup: (s) => s.evaluate((list) => (window.__tilePieces = list), pieces),
  steps,
  themes: ["mono-dark", "mono-light", "ember-dark"].map((name) => ({ name, query: "&solo", run: playScreen })),
});

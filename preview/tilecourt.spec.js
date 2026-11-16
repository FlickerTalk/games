import assert from "node:assert/strict";
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { chromium, webkit } from "playwright";
import { start } from "./serve.js";

const OUT = "/private/tmp/ftgames-tilecourt-shots";
const FULLBAR = 52;
const ROOM_CHROME = 297;
const DEVICES = [
  { name: "360x640", width: 360, height: 640 },
  { name: "384x853", width: 384, height: 853 },
  { name: "430x932", width: 430, height: 932 },
  { name: "1280x800", width: 1280, height: 800 },
];

const server = await start(0);
const base = `http://127.0.0.1:${server.address().port}`;
const results = [];
const check = async (name, run) => {
  try {
    await run();
    results.push(["ok", name]);
  } catch (error) {
    results.push(["FAIL", name, error.message.split("\n")[0]]);
  }
};

async function phone(engine, device, { fill, query = "", side = "a" } = {}) {
  const context = await engine.newContext({ viewport: { width: Math.max(device.width * 2 + 72, 800), height: device.height + 40 }, screen: { width: device.width, height: device.height }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const problems = [];
  page.on("pageerror", (error) => problems.push(error.message));
  page.on("console", (message) => message.type() === "error" && problems.push(message.text()));
  await page.goto(`${base}/?game=tilecourt&lang=en&bare&closed&screen=${device.width}x${device.height}${query}`);
  await page.evaluate((one) => globalThis.harness.open(one), side);
  const frame = page.frameLocator(`#frame-${side}`);
  await frame.locator("ft-tilecourt canvas").waitFor();
  await page.waitForTimeout(400);
  if (fill) {
    await page.evaluate((one) => globalThis.harness.fill(one, true), side);
    await page.waitForTimeout(400);
  }
  const inner = () => page.frames().find((one) => one.url().endsWith(`/${side}/frame.html`));
  return { context, page, problems, frame, inner, side };
}

const measure = (s) =>
  s.inner().evaluate(() => {
    const view = document.getElementById("view");
    const box = view.getBoundingClientRect();
    const canvas = view.querySelector("canvas");
    const scroller = document.scrollingElement;
    return { frame: { width: innerWidth, height: innerHeight }, element: { width: box.width, height: box.height }, canvas: [canvas.width, canvas.height], scroll: scroller.scrollHeight - scroller.clientHeight, ratio: devicePixelRatio };
  });

const targets = (s) => s.inner().evaluate(() => document.getElementById("view").game.targets().map(({ kind, value, x, y, w, h }) => ({ kind, value, x, y, w, h })));

async function at(s, x, y) {
  const box = await s.page.locator(`#frame-${s.side}`).boundingBox();
  return [box.x + x, box.y + y];
}

async function tap(s, kind, value) {
  const found = (await targets(s)).find((one) => one.kind === kind && (value === undefined || one.value === value));
  assert.ok(found, `no ${kind}`);
  const [x, y] = await at(s, found.x + found.w / 2, found.y + found.h / 2);
  await s.page.mouse.click(x, y);
  await s.page.waitForTimeout(300);
}

async function dragFirst(s, { release = true } = {}) {
  const plan = await s.inner().evaluate(() => {
    const game = document.getElementById("view").game;
    const { round, layout } = game.state;
    for (let slot = 0; slot < round.slots.length; slot += 1) {
      const id = round.slots[slot];
      if (!id) continue;
      const shape = { "four-h": [4, 1] }[id];
      const width = shape ? shape[0] : 1;
      const zone = layout.slots[slot];
      const { court } = layout;
      return { from: [zone.x + zone.w / 2, zone.y + zone.h / 2], to: [court.x + court.cell * (1 + width / 2), court.y + court.cell * 3.5 + layout.lift], slot };
    }
    return null;
  });
  const [fx, fy] = await at(s, ...plan.from);
  const [tx, ty] = await at(s, ...plan.to);
  await s.page.mouse.move(fx, fy);
  await s.page.mouse.down();
  await s.page.mouse.move(tx, ty, { steps: 8 });
  if (release) await s.page.mouse.up();
  await s.page.waitForTimeout(250);
}

const finish = (s) =>
  s.inner().evaluate(async () => {
    const game = document.getElementById("view").game;
    const fits = (cells, size, cellsOf, at) => cellsOf.every(([x, y]) => x + (at % size) < size && y + Math.floor(at / size) < size && cells[(Math.floor(at / size) + y) * size + (at % size) + x] === -1);
    for (let step = 0; step < 60 && game.state.screen === "play" && !game.state.round.over; step += 1) {
      const { round, layout } = game.state;
      const { court } = layout;
      let done = false;
      for (let slot = 0; slot < round.slots.length && !done; slot += 1) {
        const id = round.slots[slot];
        if (!id) continue;
        const piece = window.__tilePieces?.[id];
        for (let spot = 0; spot < court.size * court.size && !done && piece; spot += 1) {
          if (!fits(round.court.cells, court.size, piece.cells, spot)) continue;
          const zone = layout.slots[slot];
          game.pointer({ type: "down", x: zone.x + zone.w / 2, y: zone.y + zone.h / 2 });
          const point = { x: court.x + ((spot % court.size) + piece.width / 2) * court.cell, y: court.y + (Math.floor(spot / court.size) + piece.height / 2) * court.cell + layout.lift };
          game.pointer({ type: "move", ...point });
          game.pointer({ type: "up", ...point });
          done = true;
        }
      }
      if (!done) break;
      await game.idle();
    }
    await new Promise((resolve) => setTimeout(resolve, 3200));
    await game.idle();
    return game.state.screen;
  });

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

async function shot(s, folder, name) {
  mkdirSync(join(OUT, folder), { recursive: true });
  await s.page.locator(`#frame-${s.side}`).screenshot({ path: join(OUT, folder, `${name}.png`) });
}

async function walk(engine, device, fill, query, folder) {
  const s = await phone(engine, device, { fill, query });
  await s.inner().evaluate((list) => (window.__tilePieces = list), pieces);
  await check(`${folder}: the frame is sized and does not scroll`, async () => {
    const seen = await measure(s);
    assert.ok(seen.scroll <= 1, `scrolls ${seen.scroll}px`);
    if (fill) assert.ok(Math.abs(seen.element.height - (device.height - FULLBAR)) <= 2, `element ${seen.element.height} in a frame of ${device.height - FULLBAR}`);
    else assert.ok(Math.abs(seen.element.height - Math.max(300, device.height - ROOM_CHROME)) <= 1, `element ${seen.element.height}`);
    assert.equal(seen.canvas[0], Math.round(seen.element.width * seen.ratio));
  });
  await shot(s, folder, "1-home");
  await check(`${folder}: every target inside the frame`, async () => {
    const seen = await measure(s);
    for (const one of await targets(s)) assert.ok(one.x >= 0 && one.y >= 0 && one.x + one.w <= seen.frame.width + 1 && one.y + one.h <= seen.frame.height + 1, `${one.kind} at ${one.x},${one.y}`);
  });
  await tap(s, "play");
  await shot(s, folder, "2-hint");
  await dragFirst(s, { release: false });
  await shot(s, folder, "3-carrying");
  await s.page.mouse.up();
  await s.page.waitForTimeout(150);
  await shot(s, folder, "4-laid");
  await check(`${folder}: a dragged piece is laid with the mouse`, async () => {
    const laid = await s.inner().evaluate(() => document.getElementById("view").game.state.round.placements.length);
    assert.ok(laid >= 1, "nothing laid");
  });
  await tap(s, "pause");
  await shot(s, folder, "5-pause");
  await tap(s, "resume");
  await tap(s, "speaker");
  await shot(s, folder, "6-volume");
  await tap(s, "speaker");
  await check(`${folder}: a round ends on the star screen`, async () => assert.equal(await finish(s), "end"));
  await shot(s, folder, "7-end");
  await tap(s, "home");
  await tap(s, "looks");
  await shot(s, folder, "8-looks");
  await tap(s, "tab", "effect");
  await shot(s, folder, "9-effects");
  await tap(s, "done");
  await tap(s, "avatar");
  await shot(s, folder, "10-avatar");
  await check(`${folder}: no errors`, async () => assert.deepEqual(s.problems, []));
  await s.context.close();
}

const engines = process.argv.includes("--webkit") ? [["webkit", webkit]] : [["chromium", chromium]];
for (const [label, type] of engines) {
  for (const old of existsSync(OUT) ? readdirSync(OUT).filter((name) => name.startsWith(`${label}-`)) : []) rmSync(join(OUT, old), { recursive: true, force: true });
  const engine = await type.launch();
  for (const device of DEVICES) {
    await walk(engine, device, true, "&solo", `${label}-fill-${device.name}-flick`);
    // WebKit does not take Playwright's screen size, and the room's height comes from the screen
    if (label === "chromium") await walk(engine, device, false, "&alone", `${label}-room-${device.name}-alone`);
  }
  await walk(engine, DEVICES[1], true, "&alone&theme=ember-dark", `${label}-fill-384x853-dark-app`);
  await engine.close();
}
await server.close();
for (const [status, name, why] of results) console.log(`${status === "ok" ? "ok  " : "FAIL"} ${name}${why ? `: ${why}` : ""}`);
console.log(`screenshots in ${OUT}`);
if (results.some(([status]) => status !== "ok")) process.exitCode = 1;

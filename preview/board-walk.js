import assert from "node:assert/strict";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { ROOM_CHROME } from "../kit/src/stage.js";
import { DEVICES, reportErrors, toneShares } from "./canvas-walk.js";
import { start } from "./serve.js";

const BAR_AND_BAND = 120;
// the light side's pieces keep their full colour, about 7 % of a full board of them
const BRIGHT_MOST = 10;
// the kit's tablet room lays the board beside the players, 4 px taller than the room in every game
const TABLET = 720;

export const RUNS = Object.freeze([
  ...DEVICES.flatMap((device) => [false, true].flatMap((fill) => ["mono-light", "mono-dark"].map((theme) => ({ device, fill, theme })))),
  ...[false, true].map((fill) => ({ device: DEVICES[1], fill, theme: "ember-dark" })),
]);

export const roomHolds = (device, minBoard) => device.height - ROOM_CHROME >= BAR_AND_BAND + minBoard;

const SLACK = 1;

export const outside = (area, boxes) =>
  boxes.filter((box) => box.x < area.x - SLACK || box.y < area.y - SLACK || box.x + box.width > area.x + area.width + SLACK || box.y + box.height > area.y + area.height + SLACK);

export const sharp = ({ canvas, host, ratio }) => canvas[0] === Math.round(host.width * ratio) && canvas[1] === Math.round(host.height * ratio);

function measureInFrame() {
  const box = (node) => {
    const area = node.getBoundingClientRect();
    return { x: area.x, y: area.y, width: area.width, height: area.height };
  };
  const host = document.querySelector(".ftg-board");
  const canvas = host.querySelector("canvas");
  const scroller = document.scrollingElement;
  return {
    frame: { x: 0, y: 0, width: innerWidth, height: innerHeight },
    host: box(host),
    canvas: [canvas.width, canvas.height],
    ratio: devicePixelRatio,
    squares: [...host.querySelectorAll("button[data-key]")].map(box),
    page: document.querySelector(".ftg").getBoundingClientRect().bottom + scrollY,
    scroll: scroller.scrollHeight - scroller.clientHeight,
  };
}

function canvasPixels() {
  const canvas = document.querySelector(".ftg-board canvas");
  const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
  const found = [];
  for (let at = 0; at < data.length; at += 4 * 7) if (data[at + 3] > 0) found.push([data[at], data[at + 1], data[at + 2]]);
  return found;
}

async function phone(browser, base, game, run, out) {
  const { device, fill, theme } = run;
  const context = await browser.newContext({ viewport: { width: Math.max(device.width * 2 + 72, 800), height: device.height + 40 }, screen: { width: device.width, height: device.height }, deviceScaleFactor: 2 });
  await context.addInitScript(reportErrors);
  const page = await context.newPage();
  const problems = [];
  page.on("pageerror", (error) => problems.push(error.message));
  page.on("console", (message) => message.type() === "error" && problems.push(message.text()));
  await page.goto(`${base}/?game=${game}&lang=en&bare&closed&solo&theme=${theme}&screen=${device.width}x${device.height}`);
  await page.evaluate(() => globalThis.harness.open("a"));
  const frame = page.frameLocator("#frame-a");
  await frame.locator(".ftg").waitFor();
  await page.waitForTimeout(400);
  if (fill) {
    await page.evaluate(() => globalThis.harness.fill("a", true));
    await page.waitForTimeout(400);
  }
  const inner = () => page.frames().find((one) => one.url().endsWith("/a/frame.html"));
  const s = { context, page, problems, frame, run, out };
  s.evaluate = (code, arg) => inner().evaluate(code, arg);
  s.tap = async (selector) => {
    await frame.locator(selector).first().click();
    await page.waitForTimeout(300);
  };
  s.shot = async (name) => {
    mkdirSync(out, { recursive: true });
    await page.locator("#device-a").screenshot({ path: join(out, `${name}.png`) });
  };
  s.myTurn = () => s.evaluate(() => document.querySelector("#view").table.view?.myTurn === true);
  s.waitTurn = async () => {
    for (let tries = 0; tries < 30 && !(await s.myTurn()); tries += 1) await page.waitForTimeout(200);
  };
  s.open = () => s.evaluate(() => [...document.querySelectorAll(".ftg-board button[data-key]")].filter((one) => !one.disabled).map((one) => ({ key: one.dataset.key, mark: one.dataset.mark ?? "" })));
  s.measure = () => s.evaluate(measureInFrame);
  s.samples = () => s.evaluate(canvasPixels);
  return s;
}

async function standard(s, check, label, minBoard) {
  const { device, fill, theme } = s.run;
  const seen = await s.measure();
  await check(`${label}: the board's canvas is sharp`, async () => assert.ok(sharp(seen), `canvas ${seen.canvas} for ${seen.host.width}x${seen.host.height} at ${seen.ratio}`));
  await check(`${label}: the board stays inside the frame and every square inside the board`, async () => {
    assert.deepEqual(outside(seen.frame, [{ ...seen.host, y: 0, height: Math.min(seen.host.height, seen.frame.height) }]), []);
    assert.deepEqual(outside(seen.host, seen.squares), []);
  });
  if (fill) await check(`${label}: nothing scrolls in full screen`, async () => assert.ok(seen.scroll <= 1, `scrolls ${seen.scroll}px`));
  if (!fill && device.width < TABLET && roomHolds(device, minBoard)) {
    const room = device.height - ROOM_CHROME;
    await check(`${label}: the game fits the room`, async () => assert.ok(seen.page <= room + 1, `the page is ${Math.round(seen.page)} px in a room of ${room}`));
  }
  if (theme.endsWith("-dark")) {
    const shares = toneShares(await s.samples());
    console.log(`${label}: board L>=0.8 ${shares.bright}%, L>=0.6 ${shares.light}%, vivid ${shares.vivid}%`);
    await check(`${label}: the board is not bright on a dark page`, async () => assert.ok(shares.bright <= BRIGHT_MOST, `${shares.bright}% at L>=0.8`));
  }
}

export async function walkBoardGame({ game, out, minBoard, steps, runs = RUNS }) {
  const { chromium } = await import("playwright");
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
  if (existsSync(out)) rmSync(out, { recursive: true, force: true });
  const browser = await chromium.launch();
  for (const run of runs) {
    const label = `${run.device.name}-${run.fill ? "fill" : "room"}-${run.theme}`;
    const s = await phone(browser, base, game, run, join(out, label));
    await s.tap('[data-kit="new"]');
    await steps(s, { check, label });
    await standard(s, check, label, minBoard);
    await check(`${label}: no errors`, async () => assert.deepEqual(s.problems, []));
    await s.context.close();
  }
  await browser.close();
  await server.close();
  for (const [status, name, why] of results) console.log(`${status === "ok" ? "ok  " : "FAIL"} ${name}${why ? `: ${why}` : ""}`);
  console.log(`screenshots in ${out}`);
  if (results.some(([status]) => status !== "ok")) process.exitCode = 1;
  return results;
}

import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { walkBoardGame } from "./board-walk.js";
import { start } from "./serve.js";
import { accepted, pathOf, wordsOn } from "../games/wordgrid/src/rules.js";

const OUT = "/private/tmp/ftgames-wordgrid-shots";
const tile = (cell) => `.ftg-board button[data-cell="${cell}"]`;
const NONSENSE = [[0, 1, 2], [2, 1, 0], [0, 4, 8], [8, 4, 0], [3, 7, 11]];

const stateOf = (s) => s.evaluate(() => document.querySelector("#view").table.view.state);

async function trace(s, path) {
  for (const cell of path) await s.tap(tile(cell));
}

async function freshWord(s) {
  const { grid, lang, said } = await stateOf(s);
  const word = wordsOn(grid, lang).find((one) => !said[0].includes(one) && !said[1].includes(one));
  return word ? pathOf(grid, word) : null;
}

function overlaps() {
  const boxes = (selector) => [...document.querySelectorAll(selector)].map((node) => node.getBoundingClientRect()).filter((box) => box.width && box.height);
  const tiles = boxes(".ftg-board button[data-cell]");
  const rows = boxes(".fwg-scores, .fwg-word, .fwg-lists");
  const crossing = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
  return rows.flatMap((row) => tiles.filter((one) => crossing(row, one)).map(() => `${Math.round(row.top)}-${Math.round(row.bottom)}`));
}

const marked = (s, name) => s.evaluate((mark) => [...document.querySelectorAll(`.ftg-board button[data-mark~="${mark}"]`)].map((one) => Number(one.dataset.cell)), name);

async function playRound(s, check, label) {
  await s.waitTurn();
  await s.shot("1-start");
  await check(`${label}: the rows around the board never cover a tile`, async () => assert.deepEqual(await s.evaluate(overlaps), []));
  const { grid, lang } = await stateOf(s);
  const nonsense = NONSENSE.find((path) => !accepted(lang, path.map((cell) => grid[cell]).join("")));
  await trace(s, nonsense);
  await check(`${label}: tapped tiles are traced in order`, async () => {
    assert.deepEqual(await marked(s, "path"), [...nonsense].sort((a, b) => a - b));
    assert.equal(await s.evaluate(() => document.querySelector(".fwg-word b").textContent), nonsense.map((cell) => grid[cell]).join(""));
  });
  await s.shot("2-traced");
  await s.tap('[data-act="say"]');
  await s.shot("3-refused");
  await s.tap(tile(nonsense[0]));
  const path = await freshWord(s);
  if (path) {
    await trace(s, path);
    await s.tap('[data-act="say"]');
    await s.page.waitForTimeout(250);
    await s.shot("4-said");
  }
  await s.waitTurn();
  if (await s.myTurn()) {
    await s.tap('[data-act="pass"]');
    await s.page.waitForTimeout(700);
    await s.shot("5-their-word");
  }
  const over = () => s.evaluate(() => document.querySelector("#view").table.view.phase === "over");
  for (let turn = 0; turn < 60 && !(await over()); turn += 1) {
    await s.waitTurn();
    if (await s.myTurn()) await s.tap('[data-act="pass"]');
  }
  await check(`${label}: the round is played out`, async () => assert.ok(await over()));
  await s.page.waitForTimeout(2500);
  await s.shot("6-over");
}

await walkBoardGame({ game: "wordgrid", out: OUT, minBoard: 300, steps: async (s, { check, label }) => playRound(s, check, label) });

async function languages() {
  const { chromium } = await import("playwright");
  const server = await start(0);
  const browser = await chromium.launch();
  const failures = [];
  for (const [lang, theme, label] of [["es", "mono-light", "fila"], ["ar", "ember-dark", "الصف"]]) {
    const context = await browser.newContext({ viewport: { width: 800, height: 893 }, screen: { width: 384, height: 853 }, deviceScaleFactor: 2 });
    const page = await context.newPage();
    const problems = [];
    page.on("pageerror", (error) => problems.push(error.message));
    page.on("console", (message) => message.type() === "error" && problems.push(message.text()));
    await page.goto(`http://127.0.0.1:${server.address().port}/?game=wordgrid&lang=${lang}&bare&closed&solo&theme=${theme}&screen=384x853`);
    await page.evaluate(() => globalThis.harness.open("a"));
    const frame = page.frameLocator("#frame-a");
    await frame.locator('[data-kit="new"]').first().click();
    const inner = page.frames().find((one) => one.url().endsWith("/a/frame.html"));
    for (let tries = 0; tries < 30 && !(await inner.evaluate(() => document.querySelector("#view").table.view?.myTurn === true)); tries += 1) await page.waitForTimeout(200);
    await frame.locator(tile(0)).click();
    await frame.locator(tile(5)).click();
    await page.waitForTimeout(400);
    mkdirSync(join(OUT, "languages"), { recursive: true });
    await page.locator("#device-a").screenshot({ path: join(OUT, "languages", `${lang}-${theme}.png`) });
    const seen = await inner.evaluate(() => {
      const first = document.querySelector('.ftg-board button[data-cell="0"]').getBoundingClientRect();
      const last = document.querySelector('.ftg-board button[data-cell="3"]').getBoundingClientRect();
      return { grid: document.querySelector("#view").table.view.state.lang, label: document.querySelector('.ftg-board button[data-cell="0"]').getAttribute("aria-label"), ltr: first.left < last.left };
    });
    const wanted = lang === "es" ? "es" : "en";
    if (seen.grid !== wanted) failures.push(`${lang}: the letters are drawn for ${seen.grid}`);
    if (!seen.label.includes(label)) failures.push(`${lang}: a tile is named "${seen.label}"`);
    if (!seen.ltr) failures.push(`${lang}: the grid is mirrored`);
    if (problems.length) failures.push(`${lang}: ${problems.join(" | ")}`);
    await context.close();
  }
  await browser.close();
  await server.close();
  for (const failure of failures) console.log(`FAIL ${failure}`);
  console.log(failures.length ? "" : "ok   Spanish and Arabic: their letters, their labels, the grid never mirrored, no errors");
  if (failures.length) process.exitCode = 1;
}

await languages();

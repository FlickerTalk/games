// Every game fits the app's game room without scrolling, in every state, on real phone sizes: the
// room is what the app's chrome leaves of the screen (297 px on a Samsung S20+, 2026-10-03). Run in
// Chromium (Playwright) in the preview's room, with the longest texts (German, Spanish): waiting,
// "does not have it open", in a game, and the result — the page no taller than the room, and the
// state's own action (try again, send the result, play again) inside it. Chess stays playable in a
// game: squares of at least 40 px.
//
// Run: npm run room   (after npm run build; `npm run room -- gomoku` for one game)
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { start } from "./serve.js";
import { PLAYS, turns } from "./shots.js";

const PHONES = [
  { name: "Samsung S20+ (room 556)", width: 384, height: 853 },
  { name: "360×740 phone (room 443)", width: 360, height: 740 },
];
const LANGS = ["de", "es"];
/** Every game, or the ones named on the command line (`npm run room -- gomoku eights`). */
const GAMES = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(PLAYS);

const server = await start(0);
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const results = [];
const check = async (name, run) => {
  try {
    await run();
    results.push(["ok", name]);
  } catch (error) {
    results.push(["FAIL", name, error.message]);
  }
};

/**
 * Whether phone `side`'s page fits its room, and `action` (a selector) ends inside it. Measured on
 * the kit's own page, from its top: the frame's height only ever grows (the bridge reports the
 * document's scroll height, which never falls below the frame's current height), so the room's
 * scroll height would keep the tallest state seen.
 */
async function fits(page, side, action) {
  const room = await page.locator(`#device-${side} .room`).evaluate((node) => node.clientHeight);
  const frame = page.frames().find((one) => one.url().endsWith(`/${side}/frame.html`));
  const seen = await frame.evaluate((selector) => {
    const bottom = (node) => (node ? node.getBoundingClientRect().bottom + scrollY : null);
    const stage = document.querySelector(".ftg-stage");
    const board = document.querySelector(".ftg-board").getBoundingClientRect();
    // What is not drawn (display: none, `hidden`) has no box and cannot spill.
    const spill = [...document.querySelectorAll(".ftg-board *")].reduce((most, node) => {
      const box = node.getBoundingClientRect();
      if (!box.width && !box.height) return most;
      return Math.max(most, box.right - board.right, box.bottom - board.bottom, board.left - box.left);
    }, 0);
    return {
      page: bottom(document.querySelector(".ftg")),
      action: selector ? bottom(document.querySelector(selector)) : null,
      spill,
      stage: Math.round(stage.getBoundingClientRect().width),
    };
  }, action ?? null);
  assert.ok(seen.page <= room + 1, `the page is ${Math.round(seen.page)} px in a room of ${room}`);
  assert.ok(seen.spill <= 1, `the board spills ${Math.round(seen.spill)} px out of its ${seen.stage} px square`);
  if (!action) return;
  assert.ok(seen.action !== null, `no ${action}`);
  assert.ok(seen.action <= room + 1, `${action} ends at ${Math.round(seen.action)} in a room of ${room}`);
}

for (const phone of PHONES) {
  for (const lang of LANGS) {
    for (const game of GAMES) {
      const plays = PLAYS[game];
      const rules = await import(`../games/${game}/src/rules.js`);
      const context = await browser.newContext({
        viewport: { width: phone.width * 2 + 72, height: phone.height + 40 },
        screen: { width: phone.width, height: phone.height },
      });
      const page = await context.newPage();
      await page.goto(`${base}/?game=${game}&lang=${lang}&bare&closed&screen=${phone.width}x${phone.height}`);
      const frame = (side) => page.frameLocator(`#frame-${side}`);
      const touch = async (side, selector) => {
        await frame(side).locator(selector).first().click();
        await page.waitForTimeout(250);
      };
      const play = async (side, move) => {
        for (const selector of [plays.move(move)].flat()) await touch(side, selector);
      };
      const label = (state) => `${phone.name} · ${lang} · ${game} · ${state}`;

      await page.evaluate(() => globalThis.harness.open("a"));
      await frame("a").locator(".ftg").waitFor();
      await touch("a", '[data-kit="new"]');
      await page.waitForTimeout(400);
      await check(label("waiting"), () => fits(page, "a"));
      await page.waitForTimeout(8_600);
      await check(label("does not have it open"), () => fits(page, "a", '[data-kit="retry"]'));

      await page.evaluate(() => globalThis.harness.open("b"));
      await frame("b").locator(".ftg").waitFor();
      await touch("a", '[data-kit="retry"]');
      // The chips may be hidden in a short room: the turn is known once one is marked.
      await frame("a").locator(".ftg-player.turn").first().waitFor({ state: "attached" });
      await page.waitForTimeout(400);
      const [x, o] = (await frame("a").locator(".ftg-status.mine").count()) ? ["a", "b"] : ["b", "a"];
      const over = async () => (await frame(x).locator('[data-kit="again"]').count()) + (await frame(o).locator('[data-kit="again"]').count()) > 0;
      /** The side to move, by its chip; `first` when neither is marked (a roll or a shuffle on its way). */
      const mover = async (first) => ((await frame(x).locator(".ftg-player.me.turn").count()) ? x : (await frame(o).locator(".ftg-player.me.turn").count()) ? o : first);
      /** A live game (a game of chance): each tap goes to whatever the side to move may do; a round
       *  that goes on past `taps` touches ends with `o` resigning, so the result is seen. */
      const liveRound = async (first, taps = 300) => {
        for (let at = 0; at < taps && !(await over()); at += 1) await touch(await mover(first), plays.live);
        if (!(await over())) {
          await touch(o, '[data-kit="resign"]');
          await touch(o, '[data-kit="yes"]');
        }
      };
      // The round, by the rules: a side that may move again (a box closed) makes the next move too.
      const round = plays.live ? [] : turns(rules, [...plays.opening, ...plays.winning], [x, o]);
      if (plays.live) for (let at = 0; at < 8; at += 1) await touch(await mover(x), plays.live);
      else for (const [side, move] of round.slice(0, plays.opening.length)) await play(side, move);
      await page.waitForTimeout(400);
      for (const who of [x, o]) await check(label(`in a game (${who === x ? "first" : "second"})`), () => fits(page, who));
      if (game === "chess") {
        await check(label("in a game: squares of 40 px or more"), async () => {
          const board = await frame(x).locator(".ftg-stage").boundingBox();
          assert.ok(board.width / 8 >= 40, `squares of ${(board.width / 8).toFixed(1)} px`);
        });
      }
      if (plays.live) await liveRound(o);
      else for (const [side, move] of round.slice(plays.opening.length)) await play(side, move);
      await page.waitForTimeout(600);
      for (const who of [x, o]) {
        await check(label(`result (${who === x ? "winner" : "loser"}): send`), () => fits(page, who, '[data-kit="send"]'));
        await check(label(`result (${who === x ? "winner" : "loser"}): again`), () => fits(page, who, '[data-kit="again"]'));
      }
      await context.close();
    }
  }
}

await browser.close();
server.close();
for (const [state, name, why] of results) if (state !== "ok") console.log(`FAIL ${name}\n     ${why}`);
const failed = results.filter(([state]) => state !== "ok").length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exitCode = failed ? 1 : 0;

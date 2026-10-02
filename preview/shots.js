// `npm run shots [game]`: plays a game between the harness's two phones in Chromium and saves the
// screens a review needs (README, "Preview"), for a phone light and dark, Arabic right to left and
// a tablet in landscape. Each game says how its moves are touched and which moves win and draw.
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

export const OUT = "/private/tmp/ftgames-shots";

export const CONFIGS = [
  { name: "phone-light", device: { width: 360, height: 740 }, scale: 3, dark: false, lang: "en" },
  { name: "phone-dark", device: { width: 360, height: 740 }, scale: 3, dark: true, lang: "en" },
  { name: "phone-ar", device: { width: 360, height: 740 }, scale: 3, dark: false, lang: "ar" },
  { name: "tablet-landscape", device: { width: 1280, height: 800 }, scale: 2, dark: false, lang: "en", tablet: true },
];

export const STATES = ["list-empty", "waiting", "not-open", "mid-match", "confirm-resign", "win", "draw", "result-sent", "list"];

/**
 * How each game is played for the screenshots: the selector of a move, the first three moves
 * (✖, ⭕, ✖), the ones that end the round with ✖ winning (⭕, ✖, …, ✖: as many as the game
 * needs), and a round to a draw from its starter. A new game adds its own line here.
 */
export const PLAYS = {
  tictactoe: { move: (cell) => `[data-cell="${cell}"]`, opening: [4, 0, 2], winning: [1, 6], draw: [0, 1, 2, 4, 3, 5, 7, 6, 8] },
};

/** Moves the two sides make in turn, the first side first: `[[side, move], …]`. */
export function alternate(moves, sides) {
  return moves.map((move, at) => [sides[at % 2], move]);
}

export function shotPath(game, config, index, state, side) {
  return join(OUT, game, config, `${String(index).padStart(2, "0")}-${state}-${side}.png`);
}

async function run(browser, base, game, config) {
  const plays = PLAYS[game];
  const viewport = { width: config.device.width * 2 + 72, height: config.device.height + 40 };
  const context = await browser.newContext({ viewport, deviceScaleFactor: config.scale, colorScheme: config.dark ? "dark" : "light" });
  const page = await context.newPage();
  const problems = [];
  page.on("pageerror", (error) => problems.push(error.message));
  page.on("console", (message) => message.type() === "error" && problems.push(message.text()));
  const query = new URLSearchParams({ game, lang: config.lang });
  for (const flag of ["bare", "closed", ...(config.dark ? ["dark"] : [])]) query.set(flag, "");
  if (config.tablet) query.set("layout", "tablet");
  await page.goto(`${base}/?${query}`);

  const frame = (side) => page.frameLocator(`#frame-${side}`);
  let index = 0;
  const shot = async (state, side) => {
    index += 1;
    await page.waitForTimeout(600);
    await page.locator(`#device-${side}`).screenshot({ path: shotPath(game, config.name, index, state, side) });
  };
  const touch = async (side, selector) => {
    await frame(side).locator(selector).first().click();
    await page.waitForTimeout(250);
  };

  await page.evaluate(() => globalThis.harness.open("a"));
  await frame("a").locator(".ftg").waitFor();
  await shot("list-empty", "a");
  await touch("a", '[data-kit="new"]');
  await shot("waiting", "a");
  await page.waitForTimeout(8_600);
  await shot("not-open", "a");

  await page.evaluate(() => globalThis.harness.open("b"));
  await frame("b").locator(".ftg").waitFor();
  await touch("a", '[data-kit="retry"]');
  await frame("a").locator(".ftg-player.turn").waitFor();
  const [x, o] = (await frame("a").locator(".ftg-player.me.turn").count()) ? ["a", "b"] : ["b", "a"];
  const [x1, o1, x2] = plays.opening;
  await touch(x, plays.move(x1));
  await touch(o, plays.move(o1));
  await touch(x, plays.move(x2));
  await shot("mid-match", o);
  await shot("mid-match", x);
  await touch(o, '[data-kit="resign"]');
  await shot("confirm-resign", o);
  await touch(o, '[data-kit="no"]');
  for (const [side, move] of alternate(plays.winning, [o, x])) await touch(side, plays.move(move));
  await shot("win", x);
  await shot("win", o);

  // The next round starts with the other person.
  await touch(o, '[data-kit="again"]');
  let side = o;
  for (const move of plays.draw) {
    await touch(side, plays.move(move));
    side = side === x ? o : x;
  }
  await shot("draw", o);
  await shot("draw", x);
  await touch(x, '[data-kit="send"]');
  await shot("result-sent", x);
  await touch(o, '[data-kit="back"]');
  await shot("list", o);
  await context.close();
  return problems;
}

if (process.argv[1] === import.meta.filename) {
  const { chromium } = await import("playwright");
  const { start } = await import("./serve.js");
  const games = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(PLAYS);
  const server = await start(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  let failed = false;
  for (const game of games) {
    rmSync(join(OUT, game), { recursive: true, force: true });
    for (const config of CONFIGS) {
      mkdirSync(join(OUT, game, config.name), { recursive: true });
      const problems = await run(browser, base, game, config);
      console.log(`${game} ${config.name}: ${STATES.length} states${problems.length ? `, problems: ${problems.join(" | ")}` : ""}`);
      failed ||= problems.length > 0;
    }
  }
  await browser.close();
  server.close();
  console.log(`screenshots in ${OUT}/`);
  if (failed) process.exitCode = 1;
}

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
  { name: "phone-samsung", device: { width: 384, height: 853 }, scale: 3, dark: true, lang: "es" },
  { name: "phone-samsung-light", device: { width: 384, height: 853 }, scale: 3, dark: false, lang: "es" },
];

export const STATES = ["list-empty", "waiting", "not-open", "mid-match", "confirm-resign", "win", "draw", "result-sent", "list"];

/**
 * How each game is played for the screenshots: what a move touches (one selector, or several in
 * order), the first three moves (the starter, the other, the starter), the ones that end the
 * round with the starter winning (as many as the game needs, the other side first), and a round to
 * a draw from its starter. A new game adds its own line
 * here; `scenes` adds states of its own at the end, from where the common ones leave the phones.
 */
export const PLAYS = {
  tictactoe: { move: (cell) => `[data-cell="${cell}"]`, opening: [4, 0, 2], winning: [1, 6], draw: [0, 1, 2, 4, 3, 5, 7, 6, 8] },
  reversi: { move: (cell) => `[data-cell="${cell}"]`, opening: [19,34,44], winning: [37,41,21,46,11,10,53,42,33,51,38,25,55,14,32,24,1,20,7,30,39,40,58,29,26,2,43,59,12,47,3,45,60,17,8,18,54,16,9,52,13,5,22,63,4,31,62,23,48,6,49,56,61,57,15,0,50], draw: [44,45,19,20,37,29,30,18,12,31,46,34,23,15,10,13,33,2,14,4,21,6,1,51,5,43,59,55,9,22,47,32,39,11,26,52,53,16,42,0,38,60,63,41,50,61,54,49,62,25,24,3,17,57,8,40,48,56,7,58] },
  checkers: { move: (squares) => squares.split("-").map((square) => `[data-cell="${square}"]`), opening: ["23-30", "42-33", "30-37"], winning: ["44-30", "21-39", "51-42", "12-21", "53-44", "39-53", "60-46", "19-26", "33-19", "10-28", "58-51", "14-23", "42-35", "28-42-60", "49-42", "60-51", "62-53", "51-33", "40-26", "17-35", "44-26", "5-14", "46-39", "8-17", "26-8", "23-30", "56-49", "1-10", "49-42", "21-28", "39-21", "14-23", "42-33", "28-37", "55-46", "37-55", "33-24", "10-17", "24-10", "3-17", "53-46", "17-24", "46-37", "23-30", "37-23", "24-33", "8-1", "33-42", "23-14", "55-62", "21-12", "7-21", "1-10", "62-53", "10-1", "53-44", "1-8", "42-51", "8-17", "44-53", "17-26", "51-58", "12-3", "53-62", "3-10", "21-28", "10-19", "58-51", "19-37", "51-42", "26-17", "62-53", "17-8", "42-35", "37-28", "35-21", "8-17", "53-46", "17-26", "46-37", "26-19", "21-30", "19-26", "30-39", "26-17", "37-28", "17-26", "28-19", "26-12", "39-30", "12-21", "30-12"], draw: ["21-30", "42-33", "14-21", "33-26", "19-33", "40-26", "17-35", "44-26", "10-17", "49-42", "17-35-49", "56-42", "30-37", "46-28-14", "7-21", "51-44", "21-28", "44-37", "28-46", "53-39", "12-19", "62-53", "8-17", "53-46", "3-10", "58-49", "23-30", "39-21", "19-28", "42-35", "28-42-56", "60-53", "56-49", "21-12", "5-19", "46-37", "49-40", "53-46", "19-26", "46-39", "17-24", "39-30", "10-19", "37-28", "19-37", "30-21", "26-35", "21-12", "37-44", "12-5", "35-42", "5-12", "44-51", "12-21", "1-10", "55-46", "40-33", "21-12", "51-60", "12-3", "10-17", "3-12", "60-51", "12-3", "51-44", "3-10", "17-26", "10-17", "42-51", "17-35-53", "33-26", "53-44", "26-17", "44-58", "24-33", "46-39", "33-42", "39-30", "17-10", "30-21", "42-49", "58-40", "10-19", "21-14", "19-12", "40-33", "12-19", "33-40", "19-10", "14-7", "10-17", "7-14", "17-10", "14-23", "10-3", "40-49", "3-12", "49-58", "12-3", "23-14", "3-12", "14-7", "12-19", "58-51", "19-28", "51-44", "28-19", "44-37", "19-10", "37-46", "10-19", "46-37", "19-26", "37-44", "26-17", "44-37", "17-8", "7-14", "8-1", "14-21", "1-8", "37-44", "8-1", "21-28", "1-8", "28-35", "8-17", "44-53", "17-24", "35-44", "24-33", "53-60", "33-42", "44-37", "42-33", "37-46", "33-24", "60-53", "24-17", "46-37"] },
  dotsandboxes: { move: (line) => `[data-line="${line}"]`, opening: [20, 36, 31], winning: [11, 29, 13, 19, 26, 25, 10, 3, 16, 37, 39, 21, 35, 27, 12, 2, 4, 9, 5, 8, 18, 24, 23, 32, 0, 6, 14, 7, 15, 30, 1, 38, 34, 17, 28, 33, 22], draw: [13, 27, 0, 20, 6, 2, 17, 5, 7, 11, 39, 38, 26, 36, 4, 9, 30, 34, 14, 35, 28, 37, 16, 22, 23, 3, 1, 25, 19, 8, 21, 12, 24, 29, 33, 18, 10, 15, 32, 31] },
  mancala: { move: (pit) => `[data-move="${pit}"]`, opening: [3, 1, 5], winning: [1, 4, 0, 1, 3, 2, 1, 1, 2, 3, 3, 1, 5, 0, 0, 1, 3, 3, 2, 0, 5, 2, 4, 0, 0, 5, 5, 0, 2, 3, 3, 0, 5], draw: [0, 0, 2, 4, 3, 5, 1, 3, 1, 4, 3, 1, 5, 0, 4, 3, 2, 5, 5, 2, 0, 4, 1, 1, 5, 3, 0, 2, 3, 5] },
  fourinarow: { move: (column) => `[data-col="${column}"]`, opening: [3, 4, 3], winning: [4, 3, 4, 3], draw: [0, 1, 0, 1, 0, 0, 2, 0, 2, 0, 2, 1, 1, 1, 3, 1, 3, 2, 2, 4, 2, 4, 3, 3, 5, 3, 5, 3, 5, 4, 4, 5, 6, 5, 6, 5, 6, 6, 4, 6, 4, 6] },
  chess: {
    move: (uci) => [uci.slice(0, 2), uci.slice(2, 4)].map((square) => `rect.square[data-square="${square}"]`),
    opening: ["e2e4", "g7g5", "d2d4"],
    winning: ["f7f6", "d1h5"],
    // Sam Loyd's stalemate in ten moves.
    draw: "e2e3 a7a5 d1h5 a8a6 h5a5 h7h5 h2h4 a6h6 a5c7 f7f6 c7d7 e8f7 d7b7 d8d3 b7b8 d3h7 b8c8 f7g6 c8e6".split(" "),
    // A new match: the opening from each side, where a piece may go, a check, then a promotion.
    async scenes({ open, frame, touch, play, shot, x, o }) {
      await open(x);
      await touch(o, '[data-kit="new"]');
      await frame(o).locator(".ftg-player.turn").waitFor({ state: "attached" });
      const [white, black] = (await frame(o).locator(".ftg-player.me.turn").count()) ? [o, x] : [x, o];
      await shot("start-white", white);
      await shot("start-black", black);
      await play(white, "e2e4");
      await play(black, "f7f6");
      await touch(white, 'rect.square[data-square="d1"]');
      await shot("legal-moves", white);
      await touch(white, 'rect.square[data-square="h5"]');
      await shot("check", black);
      await shot("check", white);
      // White resigns; black starts the next round, with white.
      await touch(white, '[data-kit="resign"]');
      await touch(white, '[data-kit="yes"]');
      await touch(black, '[data-kit="again"]');
      const line = "a2a4 b7b5 a4b5 a7a6 b5a6 c8b7 a6b7 b8c6".split(" ");
      for (const [at, uci] of line.entries()) await play(at % 2 ? white : black, uci);
      await play(black, "b7a8");
      await shot("promotion", black);
      await touch(black, '.promotion-dialog-button-group[data-piece="wq"] rect');
      await shot("promoted", white);
    },
  },
};

/** The selectors a move touches, in order. */
export function touches(plays, move) {
  return [plays.move(move)].flat();
}

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
  // The phone's screen: the app's room is what its chrome leaves of it.
  const context = await browser.newContext({ viewport, deviceScaleFactor: config.scale, colorScheme: config.dark ? "dark" : "light", screen: config.device });
  const page = await context.newPage();
  const problems = [];
  page.on("pageerror", (error) => problems.push(error.message));
  page.on("console", (message) => message.type() === "error" && problems.push(message.text()));
  const query = new URLSearchParams({ game, lang: config.lang });
  for (const flag of ["bare", "closed", ...(config.dark ? ["dark"] : [])]) query.set(flag, "");
  if (config.tablet) query.set("layout", "tablet");
  else query.set("screen", `${config.device.width}x${config.device.height}`);
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
  const play = async (side, move) => {
    for (const selector of touches(plays, move)) await touch(side, selector);
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
  await frame("a").locator(".ftg-player.turn").waitFor({ state: "attached" });
  const [x, o] = (await frame("a").locator(".ftg-player.me.turn").count()) ? ["a", "b"] : ["b", "a"];
  const [x1, o1, x2] = plays.opening;
  await play(x, x1);
  await play(o, o1);
  await play(x, x2);
  await shot("mid-match", o);
  await shot("mid-match", x);
  await touch(o, '[data-kit="resign"]');
  await shot("confirm-resign", o);
  await touch(o, '[data-kit="no"]');
  for (const [side, move] of alternate(plays.winning, [o, x])) await play(side, move);
  await shot("win", x);
  await shot("win", o);

  // The next round starts with the other person.
  await touch(o, '[data-kit="again"]');
  let side = o;
  for (const move of plays.draw) {
    await play(side, move);
    side = side === x ? o : x;
  }
  await shot("draw", o);
  await shot("draw", x);
  await touch(x, '[data-kit="send"]');
  await shot("result-sent", x);
  await touch(o, '[data-kit="back"]');
  await shot("list", o);
  if (plays.scenes) {
    const open = async (side) => {
      await page.evaluate((one) => globalThis.harness.open(one), side);
      await frame(side).locator(".ftg").waitFor();
    };
    await plays.scenes({ page, open, frame, touch, play, shot, x, o });
  }
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

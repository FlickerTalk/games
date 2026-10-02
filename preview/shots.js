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

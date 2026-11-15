import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { start } from "./serve.js";
import { PLAYS, touches, turns } from "./shots.js";

const OUT = "/private/tmp/ftgames-fullscreen-shots";
const FULLBAR = 52;
const SIZES = [
  { name: "phone-360x588", device: { width: 360, height: 640 } },
  { name: "phone-390x792", device: { width: 390, height: 844 }, turn: true },
  { name: "landscape-844x338", device: { width: 844, height: 390 } },
  { name: "tablet-1280x748", device: { width: 1280, height: 800 } },
];
const ROOMS = [
  { name: "room-384x853", device: { width: 384, height: 853 } },
  { name: "room-360x740", device: { width: 360, height: 740 } },
  { name: "room-tablet-1280x800", device: { width: 1280, height: 800 } },
];
const FILL_GAMES = ["tictactoe", "chess", "mancala", "seabattle", "wordgrid"];

const args = process.argv.slice(2);
const roomOut = args[0] === "--room" ? args[1] : null;
const games = (roomOut ? args.slice(2) : args).filter(Boolean);

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

const measure = (frame) =>
  frame.evaluate(() => {
    const root = document.querySelector(".ftg");
    const stage = document.querySelector(".ftg-stage");
    const board = document.querySelector(".ftg-board")?.getBoundingClientRect();
    const spill = board
      ? [...document.querySelectorAll(".ftg-board *")].reduce((most, node) => {
          const box = node.getBoundingClientRect();
          if (!box.width && !box.height) return most;
          return Math.max(most, box.right - board.right, box.bottom - board.bottom, board.left - box.left, board.top - box.top);
        }, 0)
      : 0;
    const table = document.getElementById("view").table;
    const scroller = document.scrollingElement;
    return {
      fill: document.documentElement.hasAttribute("data-fill"),
      frame: { width: innerWidth, height: innerHeight },
      page: Math.ceil(root.getBoundingClientRect().bottom + scrollY),
      scroll: scroller.scrollHeight - scroller.clientHeight,
      stage: stage ? Math.round(stage.getBoundingClientRect().width) : null,
      compact: root.hasAttribute("data-compact"),
      layout: getComputedStyle(document.querySelector(".ftg-main") ?? root).display,
      content: Math.round(document.querySelector(".ftg > ion-content").getBoundingClientRect().height),
      spill: Math.round(spill),
      match: table.record?.id ?? null,
      moves: table.record?.game?.moves?.length ?? null,
      phase: table.view?.phase ?? null,
    };
  });

async function session(device, game) {
  const big = Math.max(device.width, device.height);
  const context = await browser.newContext({ viewport: { width: big * 2 + 72, height: big + 40 }, screen: device });
  const page = await context.newPage();
  const problems = [];
  page.on("pageerror", (error) => problems.push(error.message));
  page.on("console", (message) => message.type() === "error" && problems.push(message.text()));
  await page.goto(`${base}/?game=${game}&lang=en&bare&closed&screen=${device.width}x${device.height}`);
  const plays = PLAYS[game];
  const frameOf = (side) => page.frames().find((one) => one.url().endsWith(`/${side}/frame.html`));
  const locate = (side) => page.frameLocator(`#frame-${side}`);
  const touch = async (side, selector) => {
    await locate(side).locator(selector).first().click();
    await page.waitForTimeout(250);
  };
  const open = async (side) => {
    await page.evaluate((one) => globalThis.harness.open(one), side);
    await locate(side).locator(".ftg").waitFor();
  };
  const sides = async () => ((await locate("a").locator(".ftg-player.me.turn").count()) ? ["a", "b"] : ["b", "a"]);
  const mover = async (fallback) => {
    for (const side of ["a", "b"]) if (await locate(side).locator(".ftg-player.me.turn").count()) return side;
    return fallback;
  };
  return { context, page, problems, plays, frameOf, locate, touch, open, sides, mover };
}

async function startMatch(s, liveTaps = 8) {
  await s.open("a");
  await s.open("b");
  await s.touch("a", '[data-kit="new"]');
  await s.locate("a").locator(".ftg-player.turn").first().waitFor({ state: "attached" });
  await s.page.waitForTimeout(400);
  const [x, o] = await s.sides();
  const rules = await import(`../games/${s.game}/src/rules.js`);
  const plays = s.plays;
  const round = plays.live ? [] : turns(rules, [...plays.opening, ...plays.winning], [x, o]);
  let at = 0;
  const play = async (side, move) => {
    for (const selector of touches(plays, move)) await s.touch(side, selector);
  };
  if (plays.live) for (let tap = 0; tap < liveTaps; tap += 1) await s.touch(await s.mover(x), plays.live);
  else for (; at < plays.opening.length; at += 1) await play(...round[at]);
  await s.page.waitForTimeout(400);
  const playOneBy = async (who) => {
    if (plays.live) {
      const moves = async () => (await measure(s.frameOf(who))).moves;
      const before = await moves();
      for (let tap = 0; tap < 60; tap += 1) {
        const side = await s.mover(x);
        await s.touch(side, plays.live);
        if (side === who && (await moves()) > before) return;
      }
      throw new Error(`${who} never made a move`);
    }
    while (at < round.length) {
      const [side, move] = round[at];
      at += 1;
      await play(side, move);
      if (side === who && touches(plays, move).length) return;
    }
    throw new Error(`${who} has no move left`);
  };
  return { x, o, playOneBy };
}

const fits = (seen, label) => {
  assert.ok(seen.fill, `${label}: no data-fill`);
  assert.ok(seen.scroll <= 1, `${label}: the frame scrolls by ${seen.scroll} px`);
  assert.ok(seen.page <= seen.frame.height + 1, `${label}: the game ends at ${seen.page} in a frame of ${seen.frame.height}`);
  assert.ok(seen.spill <= 1, `${label}: the board spills ${seen.spill} px out of its ${seen.stage} px square`);
};

const shoot = (s, side, dir, name) => s.page.locator(`#device-${side}`).screenshot({ path: join(dir, `${name}-${side}.png`) });

async function fillRun(game, size) {
  const s = await session(size.device, game);
  s.game = game;
  const dir = join(OUT, game, size.name);
  mkdirSync(dir, { recursive: true });
  const label = (what) => `${game} · ${size.name} · ${what}`;
  const summary = { game, size: size.name };
  try {
    const { x, o, playOneBy } = await startMatch(s, 0);
    const frame = s.frameOf(x);
    const room = await measure(frame);
    summary.room = room.stage;
    await shoot(s, x, dir, "1-room");

    await s.page.evaluate((side) => globalThis.harness.fill(side, true), x);
    await s.page.waitForTimeout(600);
    const full = await measure(frame);
    summary.fill = full.stage;
    summary.frame = `${full.frame.width}×${full.frame.height}`;
    summary.compact = full.compact;
    summary.layout = full.layout;
    await check(label("full screen: fits the frame, nothing scrolls"), () => {
      fits(full, "full screen");
      assert.equal(full.frame.width, size.device.width);
      assert.equal(full.frame.height, size.device.height - FULLBAR);
    });
    await check(label("full screen: same match, same moves"), () => {
      assert.equal(full.match, room.match);
      assert.equal(full.moves, room.moves);
    });
    await shoot(s, x, dir, "2-fill");

    await playOneBy(x);
    await s.page.waitForTimeout(600);
    const played = await measure(frame);
    const there = await measure(s.frameOf(o));
    await check(label("full screen: a move made at the new size reaches the other phone"), () => {
      assert.ok(played.moves > full.moves, `still ${played.moves} moves`);
      assert.equal(there.moves, played.moves);
      fits(played, "after a move");
    });
    await shoot(s, x, dir, "3-fill-played");

    if (size.turn) {
      const turnTo = (width, height) =>
        s.page.evaluate(([w, h]) => {
          document.documentElement.style.setProperty("--screen-w", `${w}px`);
          document.documentElement.style.setProperty("--screen-h", `${h}px`);
        }, [width, height]);
      await turnTo(size.device.height, size.device.width);
      await s.page.waitForTimeout(600);
      const turned = await measure(frame);
      summary.turned = `${turned.stage} (${turned.frame.width}×${turned.frame.height}, ${turned.layout})`;
      await check(label("turned to landscape: re-fits the frame"), () => {
        fits(turned, "turned");
        assert.equal(turned.frame.height, size.device.width - FULLBAR);
        assert.equal(turned.moves, played.moves);
      });
      await shoot(s, x, dir, "4-turned");
      await turnTo(size.device.width, size.device.height);
      await s.page.waitForTimeout(600);
      const back = await measure(frame);
      await check(label("turned back: the same board as before"), () => {
        fits(back, "turned back");
        assert.equal(back.stage, played.stage);
      });
    }

    await s.page.evaluate((side) => globalThis.harness.fill(side, false), x);
    await s.page.waitForTimeout(800);
    const again = await measure(frame);
    const other = await measure(s.frameOf(o));
    const height = await s.page.locator(`#frame-${x}`).evaluate((node) => node.getBoundingClientRect().height);
    summary.again = again.stage;
    await check(label("back in the room: the room's board, the frame follows the content"), () => {
      assert.equal(again.fill, false);
      if (again.phase === room.phase) assert.equal(again.stage, room.stage);
      if (again.phase === other.phase) assert.equal(again.stage, other.stage, "the other phone, in the room in the same state");
      assert.equal(again.match, room.match);
      assert.equal(again.moves, played.moves);
      assert.ok(Math.abs(height - Math.max(again.page, 160)) <= 1, `frame ${height} for a page of ${again.page}`);
    });
    await shoot(s, x, dir, "5-room-again");
  } catch (error) {
    results.push(["FAIL", label("run"), error.message]);
  }
  await check(label("no errors in the console"), () => assert.deepEqual(s.problems, []));
  await s.context.close();
  return summary;
}

async function roomRun(game, size) {
  const s = await session(size.device, game);
  s.game = game;
  const seen = {};
  try {
    await s.open("a");
    await s.touch("a", '[data-kit="new"]');
    await s.page.waitForTimeout(400);
    seen.waiting = await measure(s.frameOf("a"));
    await s.touch("a", '[data-kit="back"]');
    const { x, o } = await startMatch(s);
    seen.playX = await measure(s.frameOf(x));
    seen.playO = await measure(s.frameOf(o));
    if (await s.locate(o).locator('[data-kit="resign"]:not([disabled])').count()) {
      await s.touch(o, '[data-kit="resign"]');
      await s.touch(o, '[data-kit="yes"]');
    }
    await s.page.waitForTimeout(600);
    seen.overX = await measure(s.frameOf(x));
    seen.overO = await measure(s.frameOf(o));
  } catch (error) {
    seen.error = error.message;
  }
  const shape = ({ stage, compact, layout, content, page }) => ({ stage, compact, layout, content, page });
  const out = Object.fromEntries(Object.entries(seen).map(([state, one]) => [state, typeof one === "string" ? one : shape(one)]));
  if (s.problems.length) out.problems = s.problems;
  await s.context.close();
  return out;
}

if (roomOut) {
  const all = {};
  for (const game of games.length ? games : Object.keys(PLAYS)) {
    for (const size of ROOMS) {
      all[`${game} ${size.name}`] = await roomRun(game, size);
      console.log(game, size.name, JSON.stringify(all[`${game} ${size.name}`]));
    }
  }
  writeFileSync(roomOut, `${JSON.stringify(all, null, 2)}\n`);
} else {
  const table = [];
  for (const game of games.length ? games : FILL_GAMES) {
    rmSync(join(OUT, game), { recursive: true, force: true });
    for (const size of SIZES) table.push(await fillRun(game, size));
  }
  writeFileSync(join(OUT, "summary.json"), `${JSON.stringify(table, null, 2)}\n`);
  for (const row of table) console.log(`${row.game.padEnd(12)} ${row.size.padEnd(18)} room ${row.room} → full ${row.fill} (${row.frame}, ${row.layout}${row.compact ? ", no players" : ""}) → room ${row.again}${row.turned ? ` · turned ${row.turned}` : ""}`);
  for (const [state, name, why] of results) if (state !== "ok") console.log(`FAIL ${name}\n     ${why}`);
  const failed = results.filter(([state]) => state !== "ok").length;
  console.log(`\n${results.length - failed}/${results.length} passed · screenshots in ${OUT}/`);
  process.exitCode = failed ? 1 : 0;
}

await browser.close();
server.close();

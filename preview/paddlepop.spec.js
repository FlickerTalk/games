import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { start } from "./serve.js";
import { setHidden, toneOf, toneShares, walkCanvasGame } from "./canvas-walk.js";

const OUT = "/private/tmp/ftgames-paddlepop-shots";

async function dragPaddle(s, from, to, { release = true } = {}) {
  const points = await s.evaluate(
    ({ from, to }) => {
      const { layout } = document.getElementById("view").game.state;
      const { table } = layout;
      const at = (u) => (table.turn ? [table.x + table.s * 0.2, table.y + u * table.s] : [table.x + u * table.s, table.y + table.h - table.s * 0.1]);
      return [at(from), at(to)];
    },
    { from, to },
  );
  await s.page.mouse.move(...(await s.at(...points[0])));
  await s.page.mouse.down();
  await s.page.mouse.move(...(await s.at(...points[1])), { steps: 10 });
  if (release) await s.page.mouse.up();
}

const finishSoon = (s) =>
  s.evaluate(async () => {
    const view = document.getElementById("view").game;
    const { round } = view.state;
    round.match = { ...round.match, roundSteps: round.match.step + 60 };
    for (let tries = 0; tries < 60 && view.state.screen !== "end"; tries += 1) await new Promise((resolve) => setTimeout(resolve, 100));
    return view.state.screen;
  });

async function steps(s, { check, label }) {
  await s.tap("play");
  await s.page.waitForTimeout(600);
  await s.shot("2-countdown");
  await s.page.waitForTimeout(2800);
  await s.shot("3-hint");
  await dragPaddle(s, 0.5, 0.25, { release: false });
  await s.shot("4-dragging");
  await s.page.mouse.up();
  await check(`${label}: the paddle follows a mouse drag`, async () => {
    const x = await s.evaluate(() => document.getElementById("view").game.state.round.match.paddles[0].target);
    assert.ok(Math.abs(x - 0.25) < 0.02, `target ${x}`);
  });
  await s.page.waitForTimeout(1500);
  await s.shot("5-rally");
  await check(`${label}: back from the background the round is paused until the player goes on`, async () => {
    await s.hide(true);
    await s.hide(false);
    await s.page.waitForTimeout(300);
    const seen = () => s.evaluate(() => {
      const { paused, round } = document.getElementById("view").game.state;
      return [paused, round.match.step];
    });
    const [paused, step] = await seen();
    await s.page.waitForTimeout(500);
    assert.deepEqual([paused, await seen()], [true, [true, step]]);
  });
  await s.shot("5-back-from-the-background");
  await s.tap("resume");
  await s.tap("pause");
  await s.shot("6-pause");
  await s.tap("resume");
  await s.tap("speaker");
  await s.shot("7-volume");
  await s.tap("speaker");
  await check(`${label}: a round ends on the star card`, async () => assert.equal(await finishSoon(s), "end"));
  await s.page.waitForTimeout(400);
  await s.shot("8-end");
  await s.tap("home");
  await s.tap("looks");
  await s.shot("9-paddles");
  await s.tap("tab", "table");
  await s.shot("10-tables");
  await s.tap("done");
  await s.tap("avatar");
  await s.shot("11-avatar");
}

const paddlePixels = (s) =>
  s.evaluate(() => {
    const canvas = document.querySelector("canvas");
    const ratio = canvas.width / canvas.getBoundingClientRect().width;
    const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    const { round, layout } = document.getElementById("view").game.state;
    const { table } = layout;
    const x = round.match.paddles[0].x;
    const spot = table.turn ? [table.x + 0.16 * table.s, table.y + x * table.s] : [table.x + x * table.s, table.y + table.h - 0.16 * table.s];
    const found = [];
    for (let dy = -4; dy <= 4; dy += 2) for (let dx = -20; dx <= 20; dx += 4) {
      const at = (Math.round((spot[1] + dy) * ratio) * canvas.width + Math.round((spot[0] + dx) * ratio)) * 4;
      found.push([data[at], data[at + 1], data[at + 2]]);
    }
    return found;
  });

async function playScreen(s, { check, label, theme }) {
  await s.tap("play");
  await s.page.waitForTimeout(3600);
  await s.evaluate(() => {
    const view = document.getElementById("view").game;
    view.state.taught = true;
  });
  await s.page.waitForTimeout(300);
  await s.shot("play");
  const shares = toneShares(await s.samples());
  const chroma = (await paddlePixels(s)).map((pixel) => toneOf(pixel)[1]);
  const most = Math.max(...chroma);
  console.log(`${label}: L>=0.8 ${shares.bright}%, L>=0.6 ${shares.light}%, vivid ${shares.vivid}%; paddle chroma up to ${most.toFixed(3)}`);
  await check(`${label}: the paddle keeps its full colour`, async () => assert.ok(most >= 0.09, `paddle chroma ${most.toFixed(3)}`));
  if (theme.name.endsWith("-dark")) await check(`${label}: little of the screen is bright on a dark page`, async () => assert.ok(shares.bright < 12, `${shares.bright}% at L>=0.8`));
}

async function twoPhones() {
  const { chromium } = await import("playwright");
  const server = await start(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 900, height: 900 }, screen: { width: 384, height: 853 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const problems = [];
  page.on("pageerror", (error) => problems.push(error.message));
  page.on("console", (message) => message.type() === "error" && problems.push(message.text()));
  await page.goto(`${base}/?game=paddlepop&lang=en&bare&theme=mono-dark&screen=384x853`);
  const frame = (side) => page.frames().find((one) => one.url().endsWith(`/${side}/frame.html`));
  for (const side of ["a", "b"]) await page.frameLocator(`#frame-${side}`).locator("canvas").waitFor();
  await page.waitForTimeout(600);
  for (const side of ["a", "b"]) await page.evaluate((one) => globalThis.harness.fill(one, true), side);
  await page.waitForTimeout(400);
  const shot = async (name) => {
    mkdirSync(join(OUT, "two-phones"), { recursive: true });
    await page.locator("#devices").screenshot({ path: join(OUT, "two-phones", `${name}.png`) });
  };
  const press = (side, kind) => frame(side).evaluate((wanted) => {
    const view = document.getElementById("view").game;
    view.press(view.targets().find((one) => one.kind === wanted));
  }, kind);
  return { server, browser, page, problems, frame, shot, press };
}

async function walkTwoPhones() {
  const results = [];
  const check = async (name, run) => {
    try {
      await run();
      results.push(["ok", name]);
    } catch (error) {
      results.push(["FAIL", name, error.message.split("\n")[0]]);
    }
  };
  const t = await twoPhones();
  const state = (side) => t.frame(side).evaluate(() => {
    const view = document.getElementById("view").game;
    const { round, outcome } = view.state;
    return { screen: view.state.screen, phase: view.duel.phase, seat: round?.seat ?? null, step: round?.match.step ?? 0, outcome };
  });
  await t.shot("1-both-home");
  await t.press("a", "play");
  await t.page.waitForTimeout(600);
  await t.shot("2-a-waiting-b-sees-ready");
  await t.press("b", "play");
  await t.page.waitForTimeout(1200);
  await t.shot("3-countdown");
  await t.page.waitForTimeout(4000);
  await t.shot("4-rally");
  const [a, b] = [await state("a"), await state("b")];
  await check("two phones: both play the same round, from opposite ends", async () => {
    assert.deepEqual([a.screen, b.screen], ["play", "play"]);
    assert.equal(a.seat + b.seat, 1);
    assert.ok(a.step > 100 && b.step > 100, `steps ${a.step} ${b.step}`);
  });
  await check("two phones: a round with a friend has no pause button", async () => {
    for (const side of ["a", "b"]) assert.equal(await t.frame(side).evaluate(() => document.getElementById("view").game.targets().some((one) => one.kind === "pause")), false);
  });
  await t.frame("a").evaluate(() => {
    const { round } = document.getElementById("view").game.state;
    round.match = { ...round.match, roundSteps: round.match.step + 120 };
  });
  await t.page.waitForTimeout(5000);
  await t.shot("6-both-end");
  const [endA, endB] = [await state("a"), await state("b")];
  await check("two phones: both end on the star card with the same score, mirrored", async () => {
    assert.deepEqual([endA.screen, endB.screen], ["end", "end"]);
    assert.equal(endA.outcome.mine, endB.outcome.theirs);
    assert.equal(endA.outcome.theirs, endB.outcome.mine);
  });
  for (const side of ["a", "b"]) await t.press(side, "again");
  await t.page.waitForTimeout(4500);
  await t.frame("a").evaluate(setHidden, true);
  await t.page.waitForTimeout(800);
  await t.shot("9-a-left-b-home");
  const seen = (side) => t.frame(side).evaluate(() => {
    const { duel, state } = document.getElementById("view").game;
    return { screen: state.screen, phase: duel.phase, notice: duel.notice };
  });
  const [leftA, leftB] = [await seen("a"), await seen("b")];
  await t.frame("a").evaluate(setHidden, false);
  await t.page.waitForTimeout(400);
  await check("two phones: a phone sent to the background leaves the round, and the friend goes home told why", async () => {
    assert.deepEqual(leftA, { screen: "home", phase: "left", notice: null });
    assert.deepEqual(leftB, { screen: "home", phase: "left", notice: "left" });
    assert.equal((await seen("a")).screen, "home");
  });
  await check("two phones: no errors", async () => assert.deepEqual(t.problems, []));
  await t.browser.close();
  await t.server.close();
  for (const [status, name, why] of results) console.log(`${status === "ok" ? "ok  " : "FAIL"} ${name}${why ? `: ${why}` : ""}`);
  if (results.some(([status]) => status !== "ok")) process.exitCode = 1;
}

if (!process.argv.includes("--two-only")) {
  await walkCanvasGame({
    game: "paddlepop",
    out: OUT,
    modes: [
      { name: "flick", fill: true, query: "&solo" },
      { name: "flick", fill: false, query: "&solo", engines: ["chromium"] },
      { name: "alone", fill: false, query: "&alone", engines: ["chromium"] },
    ],
    steps,
    themes: ["mono-dark", "mono-light", "ember-dark"].map((name) => ({ name, query: "&solo", run: playScreen })),
  });
}
if (!process.argv.includes("--webkit")) await walkTwoPhones();

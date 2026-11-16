import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { start } from "./serve.js";
import { toneOf, toneShares, walkCanvasGame } from "./canvas-walk.js";

const OUT = "/private/tmp/ftgames-goalswipe-shots";
const CORNER = { x: 0.2, y: 0.35 };

const swipePoints = (frame, aim) =>
  frame.evaluate((to) => {
    const { layout } = document.getElementById("view").game.state;
    const { ball, goal, reach } = layout;
    const carry = (ball.y - goal.y - goal.h / 2) / reach;
    const [x, y] = [goal.x + to.x * goal.w, goal.y + (1 - to.y) * goal.h];
    return [[ball.x, ball.y], [ball.x + (x - ball.x) / carry, ball.y + (y - ball.y) / carry]];
  }, aim);

const goalPoint = (frame, at) =>
  frame.evaluate((to) => {
    const { goal } = document.getElementById("view").game.state.layout;
    return [goal.x + to.x * goal.w, goal.y + (1 - to.y) * goal.h];
  }, at);

const kickOf = (frame) =>
  frame.evaluate(() => {
    const { round } = document.getElementById("view").game.state;
    const kick = round?.kick;
    return kick ? { phase: kick.phase, shooter: kick.shooter, ring: kick.ringAt !== null, aim: kick.aim, dive: kick.dive, outcome: kick.outcome, kicks: round.kicks.length } : { kicks: round?.kicks.length ?? 0 };
  });

async function until(frame, page, test, tries = 80) {
  for (let at = 0; at < tries; at += 1) {
    const kick = await kickOf(frame);
    if (test(kick)) return kick;
    await page.waitForTimeout(50);
  }
  return kickOf(frame);
}

async function swipe(s, aim, { release = true } = {}) {
  const [from, to] = await swipePoints(s, aim);
  await s.page.mouse.move(...(await s.at(...from)));
  await s.page.mouse.down();
  await s.page.mouse.move(...(await s.at(...to)), { steps: 8 });
  if (release) await s.page.mouse.up();
}

const finishSoon = (s) =>
  s.evaluate(async () => {
    const view = document.getElementById("view").game;
    const { round } = view.state;
    const kick = (outcome) => ({ aim: { x: 0.2, y: 0.3 }, dive: { x: 0.8, y: 0.3 }, outcome, bonus: null });
    round.kicks = ["goal", "saved", "goal", "saved", "goal", "saved"].map(kick);
    round.kick = null;
    round.endAt = performance.now() + 200;
    for (let tries = 0; tries < 60 && view.state.screen !== "end"; tries += 1) await new Promise((resolve) => setTimeout(resolve, 100));
    return view.state.screen;
  });

async function steps(s, { check, label }) {
  await s.tap("play");
  await s.page.waitForTimeout(700);
  await s.shot("2-hint");
  await swipe(s, CORNER, { release: false });
  await s.shot("3-swiping");
  await s.page.mouse.up();
  await check(`${label}: a swipe from the ball with the mouse shoots where it points`, async () => {
    const kick = await kickOf(s);
    assert.equal(kick.phase, "fly");
    assert.ok(Math.abs(kick.aim.x - CORNER.x) < 0.06 && Math.abs(kick.aim.y - CORNER.y) < 0.08, JSON.stringify(kick.aim));
  });
  await s.page.waitForTimeout(380);
  await s.shot("4-flying");
  await until(s, s.page, (kick) => kick.phase === "result");
  await s.page.waitForTimeout(350);
  await s.shot("5-result");
  const warned = await until(s, s.page, (kick) => kick.shooter === 1 && kick.phase === "fly" && kick.ring, 120);
  await s.shot("6-ring");
  await s.page.mouse.click(...(await s.at(...(await goalPoint(s, warned.aim ?? { x: 0.5, y: 0.4 })))));
  await check(`${label}: a tap on the goal while the ring shows sends the keeper there`, async () => {
    const kick = await kickOf(s);
    assert.ok(kick.dive, "no dive");
    assert.ok(Math.abs(kick.dive.x - Math.min(1, Math.max(0, warned.aim.x))) < 0.08, JSON.stringify([kick.dive, warned.aim]));
  });
  await until(s, s.page, (kick) => kick.phase === "result");
  await s.page.waitForTimeout(300);
  await s.shot("7-save");
  await until(s, s.page, (kick) => kick.phase === "aim", 120);
  await s.tap("pause");
  await s.shot("8-pause");
  await s.tap("resume");
  await s.tap("speaker");
  await s.shot("9-volume");
  await s.tap("speaker");
  await check(`${label}: a round ends on the star card`, async () => assert.equal(await finishSoon(s), "end"));
  await s.page.waitForTimeout(400);
  await s.shot("10-end");
  await s.tap("home");
  await s.tap("looks");
  await s.shot("11-balls");
  await s.tap("tab", "field");
  await s.shot("12-fields");
  await s.tap("done");
  await s.tap("avatar");
  await s.shot("13-avatar");
}

const ballPixels = (s) =>
  s.evaluate(() => {
    const canvas = document.querySelector("canvas");
    const ratio = canvas.width / canvas.getBoundingClientRect().width;
    const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    const { ball } = document.getElementById("view").game.state.layout;
    const found = [];
    for (let turn = 0; turn < 12; turn += 1) {
      const [x, y] = [ball.x + Math.cos((turn * Math.PI) / 6) * ball.size * 0.3, ball.y + Math.sin((turn * Math.PI) / 6) * ball.size * 0.3];
      const at = (Math.round(y * ratio) * canvas.width + Math.round(x * ratio)) * 4;
      found.push([data[at], data[at + 1], data[at + 2]]);
    }
    return found;
  });

async function playScreen(s, { check, label, theme }) {
  await s.evaluate(() => {
    const view = document.getElementById("view").game;
    view.state.progress = { ...view.state.progress, chosen: { ...view.state.progress.chosen, ball: "beachball" } };
    view.state.taught = { shoot: true, keep: true };
  });
  await s.tap("play");
  await s.page.waitForTimeout(500);
  await s.shot("play");
  const shares = toneShares(await s.samples());
  const most = Math.max(...(await ballPixels(s)).map((pixel) => toneOf(pixel)[1]));
  console.log(`${label}: L>=0.8 ${shares.bright}%, L>=0.6 ${shares.light}%, vivid ${shares.vivid}%; ball chroma up to ${most.toFixed(3)}`);
  await check(`${label}: the ball keeps its full colour`, async () => assert.ok(most >= 0.09, `ball chroma ${most.toFixed(3)}`));
  if (theme.name.endsWith("-dark")) await check(`${label}: little of the screen is bright on a dark page`, async () => assert.ok(shares.bright < 12, `${shares.bright}% at L>=0.8`));
  for (const field of ["beach", "stadium"]) {
    await s.evaluate((look) => {
      const view = document.getElementById("view").game;
      view.state.progress = { ...view.state.progress, received: ["beach", "star", "stadium"], chosen: { ball: "star", field: look } };
    }, field);
    await s.page.waitForTimeout(250);
    await s.shot(`play-${field}`);
    const bright = toneShares(await s.samples()).bright;
    if (theme.name.endsWith("-dark")) await check(`${label}: the ${field} is at dusk on a dark page`, async () => assert.ok(bright < 12, `${bright}% at L>=0.8`));
  }
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
  await page.goto(`${base}/?game=goalswipe&lang=en&bare&theme=mono-dark&screen=384x853`);
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
  const at = async (side, x, y) => {
    const area = await page.locator(`#frame-${side}`).boundingBox();
    return [area.x + x, area.y + y];
  };
  return { server, browser, page, problems, frame, shot, press, at };
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
    const { round } = view.state;
    return { screen: view.state.screen, seat: round?.seat ?? null, kicks: round?.kicks ?? [], phase: round?.kick?.phase ?? null, status: view.friend.status };
  });
  await t.shot("1-both-home");
  await t.press("a", "play");
  await t.page.waitForTimeout(900);
  await t.shot("2-a-started-b-invited");
  await check("two phones: the other phone is invited and starts nothing by itself", async () => {
    const b = await state("b");
    assert.equal(b.screen, "home");
    assert.equal(b.status.invited, true);
  });
  await t.press("b", "play");
  await t.page.waitForTimeout(600);
  const [a, b] = [await state("a"), await state("b")];
  await check("two phones: both are in the same round, one to shoot and one to keep", async () => {
    assert.deepEqual([a.screen, b.screen], ["play", "play"]);
    assert.equal(a.seat + b.seat, 1);
    assert.deepEqual([a.phase, b.phase].sort(), ["aim", "wait"]);
  });
  const [shooter, keeper] = a.seat === 0 ? ["a", "b"] : ["b", "a"];
  const [from, to] = await swipePoints(t.frame(shooter), CORNER);
  await t.page.mouse.move(...(await t.at(shooter, ...from)));
  await t.page.mouse.down();
  await t.page.mouse.move(...(await t.at(shooter, ...to)), { steps: 8 });
  await t.page.mouse.up();
  await t.page.waitForTimeout(700);
  await t.shot("3-shot-hidden-keeper-to-guess");
  await check("two phones: the keeper is asked to dive without seeing the shot", async () => {
    const seen = await kickOf(t.frame(keeper));
    assert.equal(seen.phase, "guess");
    assert.equal(seen.aim, null);
  });
  await t.page.mouse.click(...(await t.at(keeper, ...(await goalPoint(t.frame(keeper), { x: 0.8, y: 0.4 })))));
  await t.page.waitForTimeout(900);
  await t.shot("4-both-watch-the-kick");
  await t.page.waitForTimeout(2600);
  await t.shot("5-kick-counted-roles-swap");
  const [endA, endB] = [await state("a"), await state("b")];
  await check("two phones: both saw the same kick, a goal past a keeper who went the other way", async () => {
    assert.equal(endA.kicks.length, 1);
    assert.deepEqual(endA.kicks, endB.kicks);
    assert.equal(endA.kicks[0].outcome, "goal");
  });
  await check("two phones: no errors", async () => assert.deepEqual(t.problems, []));
  await t.browser.close();
  await t.server.close();
  for (const [status, name, why] of results) console.log(`${status === "ok" ? "ok  " : "FAIL"} ${name}${why ? `: ${why}` : ""}`);
  if (results.some(([status]) => status !== "ok")) process.exitCode = 1;
}

if (!process.argv.includes("--two-only")) {
  await walkCanvasGame({
    game: "goalswipe",
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

import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { start } from "./serve.js";
import { toneShares, walkCanvasGame } from "./canvas-walk.js";

const OUT = "/private/tmp/ftgames-duosquad-shots";
const PICK_SCREEN_OVERFLOWS_THE_SMALLEST_ROOM = { inside: false };

const worldFor = (label) => (label.endsWith("-alone") ? "land" : label.includes("-room-") ? "sea" : "space");

const read = (s) =>
  s.evaluate(() => {
    const view = document.getElementById("view").game;
    const { round } = view.state;
    return { screen: view.state.screen, world: view.state.world, total: round ? round.tally.total : 0, taught: view.state.taught, u: round ? round.crafts[round.seat].u : null, enemies: view.onShow().enemies.length };
  });

async function enemies(s) {
  for (let tries = 0; tries < 60; tries += 1) {
    if ((await read(s)).enemies > 0) return;
    await s.page.waitForTimeout(100);
  }
  throw new Error("no enemy came down");
}

async function steer(s, { check, label }) {
  const { field } = await s.evaluate(() => document.getElementById("view").game.state.layout);
  const y = field.y + field.h * 0.7;
  await s.page.mouse.move(...(await s.at(field.x + field.w * 0.3, y)));
  await s.page.mouse.down();
  await s.page.mouse.move(...(await s.at(field.x + field.w * 0.8, y)), { steps: 10 });
  await s.page.waitForTimeout(900);
  await s.shot("4-steered");
  await s.page.mouse.up();
  await check(`${label}: dragging steers the craft and ends the hint`, async () => {
    const seen = await read(s);
    assert.ok(seen.u > 0.7, `craft at ${seen.u}`);
    assert.ok(seen.taught.includes("steer"));
  });
}

const playItself = (s) =>
  s.evaluate(async () => {
    const view = document.getElementById("view").game;
    const { field } = view.state.layout;
    for (let tries = 0; tries < 40 && view.state.round.tally.total === 0; tries += 1) {
      const open = view.onShow().enemies.filter((one) => one.v > 0.02);
      if (open.length) {
        const at = { x: field.x + open[0].u * field.w, y: field.y + field.h * 0.7, id: 7 };
        view.pointer({ type: "down", ...at });
        view.pointer({ type: "up", ...at });
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return view.state.round.tally.total;
  });

const catchMate = (s) =>
  s.evaluate(() => {
    const { round } = document.getElementById("view").game.state;
    round.crafts[1 - round.seat].caught = 200;
    round.crafts[1 - round.seat].u = 0.25;
  });

const finishSoon = (s) =>
  s.evaluate(async () => {
    const view = document.getElementById("view").game;
    const { round } = view.state;
    round.roundSteps = round.step + 30;
    for (let tries = 0; tries < 60 && view.state.screen !== "end"; tries += 1) await new Promise((resolve) => setTimeout(resolve, 100));
    return view.state.screen;
  });

async function steps(s, { check, label }) {
  const world = worldFor(label);
  await s.tap("variant", world);
  await s.shot("1-home-world");
  await s.tap("play");
  await s.page.waitForTimeout(600);
  await s.shot("2-countdown");
  await s.page.waitForTimeout(2600);
  await enemies(s);
  await s.page.waitForTimeout(900);
  await s.shot("3-hint");
  await steer(s, { check, label });
  await check(`${label}: the craft's own fire pops an enemy in the ${world} world`, async () => assert.ok((await playItself(s)) >= 1));
  await s.shot("5-popped");
  await catchMate(s);
  await s.page.waitForTimeout(500);
  await s.shot("6-teammate-caught");
  await s.page.waitForTimeout(1200);
  await s.tap("pause");
  await s.shot("7-pause");
  await s.tap("resume");
  await s.tap("speaker");
  await s.shot("8-volume");
  await s.tap("speaker");
  await check(`${label}: a round ends on the star card`, async () => assert.equal(await finishSoon(s), "end"));
  await s.page.waitForTimeout(400);
  await s.shot("9-end");
  await s.tap("home");
  await s.tap("looks");
  await s.shot("10-crafts");
  await s.tap("tab", 1);
  await s.shot("10-more-crafts");
  await s.tap("done");
  await s.tap("avatar", undefined, PICK_SCREEN_OVERFLOWS_THE_SMALLEST_ROOM);
  await s.shot("11-avatar");
}

async function playScreen(s, { check, label, theme }) {
  for (const world of ["space", "sea", "land"]) {
    await s.tap("variant", world);
    await s.tap("play");
    await s.page.waitForTimeout(3600);
    await s.evaluate(() => {
      document.getElementById("view").game.state.taught = ["steer", "free"];
    });
    await enemies(s);
    await s.page.waitForTimeout(1500);
    await s.shot(`play-${world}`);
    const shares = toneShares(await s.samples());
    console.log(`${label} ${world}: L>=0.8 ${shares.bright}%, L>=0.6 ${shares.light}%, vivid ${shares.vivid}%`);
    if (theme.name.endsWith("-dark")) await check(`${label}: little of the ${world} screen is bright on a dark page`, async () => assert.ok(shares.bright < 12, `${shares.bright}% at L>=0.8`));
    await s.tap("pause");
    await s.tap("home");
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
  await page.goto(`${base}/?game=duosquad&lang=en&bare&theme=mono-dark&screen=384x853`);
  const frame = (side) => page.frames().find((one) => one.url().endsWith(`/${side}/frame.html`));
  for (const side of ["a", "b"]) await page.frameLocator(`#frame-${side}`).locator("canvas").waitFor();
  await page.waitForTimeout(600);
  for (const side of ["a", "b"]) await page.evaluate((one) => globalThis.harness.fill(one, true), side);
  await page.waitForTimeout(400);
  const shot = async (name) => {
    mkdirSync(join(OUT, "two-phones"), { recursive: true });
    await page.locator("#devices").screenshot({ path: join(OUT, "two-phones", `${name}.png`) });
  };
  const press = (side, kind, value) => frame(side).evaluate(([wanted, which]) => {
    const view = document.getElementById("view").game;
    view.press(view.targets().find((one) => one.kind === wanted && (which === null || one.value === which)));
  }, [kind, value ?? null]);
  return { server, browser, page, problems, frame, shot, press };
}

const steerTo = (frame, u) =>
  frame.evaluate((wanted) => {
    const view = document.getElementById("view").game;
    const { field } = view.state.layout;
    const at = { x: field.x + wanted * field.w, y: field.y + field.h * 0.7, id: 3 };
    view.pointer({ type: "down", ...at });
    view.pointer({ type: "up", ...at });
  }, u);

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
    const crafts = round ? round.crafts.map((craft) => ({ u: craft.u, caught: craft.caught > 0 })) : [];
    return { screen: view.state.screen, seat: round?.seat ?? null, step: round?.step ?? 0, total: round?.tally.total ?? 0, pops: round ? [...round.tally.pops.keys()].sort((a, b) => a - b) : [], crafts, world: round?.world, outcome };
  });
  await t.shot("1-both-home");
  await t.press("b", "variant", "sea");
  await t.press("a", "play");
  await t.page.waitForTimeout(600);
  await t.shot("2-a-waiting-b-sees-ready");
  await t.press("b", "play");
  await t.page.waitForTimeout(1200);
  await t.shot("3-countdown");
  await t.page.waitForTimeout(4500);
  await steerTo(t.frame("a"), 0.2);
  await steerTo(t.frame("b"), 0.8);
  await t.page.waitForTimeout(1500);
  await t.shot("4-same-waves-each-in-their-world");
  const [a, b] = [await state("a"), await state("b")];
  await check("two phones: both play the same round as one team, each in the world they chose", async () => {
    assert.deepEqual([a.screen, b.screen], ["play", "play"]);
    assert.equal(a.seat + b.seat, 1);
    assert.deepEqual([a.world, b.world], ["space", "sea"]);
    assert.ok(a.step > 100 && b.step > 100, `steps ${a.step} ${b.step}`);
  });
  await check("two phones: each sees the teammate's craft where the other steered it", async () => {
    assert.ok(Math.abs(b.crafts[a.seat].u - 0.2) < 0.03, `a seen by b at ${b.crafts[a.seat].u}`);
    assert.ok(Math.abs(a.crafts[b.seat].u - 0.8) < 0.03, `b seen by a at ${a.crafts[b.seat].u}`);
  });
  await t.page.waitForTimeout(2500);
  const [laterA, laterB] = [await state("a"), await state("b")];
  await check("two phones: what one pops is popped on the other, in one shared score", async () => {
    assert.ok(laterA.pops.length > 0, "nothing popped");
    assert.ok(Math.abs(laterA.total - laterB.total) <= 8, `${laterA.total} and ${laterB.total}`);
  });
  await t.frame("a").evaluate(() => {
    const { round } = document.getElementById("view").game.state;
    round.crafts[round.seat].caught = 240;
  });
  await t.page.waitForTimeout(500);
  await t.shot("5-a-caught-b-sees-it");
  await check("two phones: a caught craft is shown caught on the teammate's phone", async () => assert.equal((await state("b")).crafts[a.seat].caught, true));
  await t.frame("b").evaluate(() => {
    const { round } = document.getElementById("view").game.state;
    Object.assign(round.crafts[round.seat], { caught: 0, safe: 400 });
  });
  await steerTo(t.frame("b"), 0.2);
  await t.page.waitForTimeout(1800);
  await t.shot("6-b-frees-a");
  await check("two phones: the teammate flying over frees it", async () => assert.equal((await state("a")).crafts[a.seat].caught, false));
  await t.press("a", "pause");
  await t.page.waitForTimeout(600);
  await t.shot("7-a-paused-b-frozen");
  const frozen = (await state("b")).step;
  await t.page.waitForTimeout(800);
  await check("two phones: a pause on one phone freezes the other", async () => assert.equal((await state("b")).step, frozen));
  await t.press("a", "resume");
  await t.page.waitForTimeout(500);
  await t.frame("a").evaluate(() => {
    const { round } = document.getElementById("view").game.state;
    round.roundSteps = round.step + 60;
  });
  await t.page.waitForTimeout(5000);
  await t.shot("8-both-end");
  const [endA, endB] = [await state("a"), await state("b")];
  await check("two phones: both end on the star card with the same shared score, each with their part", async () => {
    assert.deepEqual([endA.screen, endB.screen], ["end", "end"]);
    assert.equal(endA.outcome.score, endB.outcome.score);
    assert.equal(endA.outcome.mine, endB.outcome.theirs);
    assert.equal(endA.outcome.theirs, endB.outcome.mine);
  });
  await check("two phones: no errors", async () => assert.deepEqual(t.problems, []));
  await t.browser.close();
  await t.server.close();
  for (const [status, name, why] of results) console.log(`${status === "ok" ? "ok  " : "FAIL"} ${name}${why ? `: ${why}` : ""}`);
  if (results.some(([status]) => status !== "ok")) process.exitCode = 1;
}

if (!process.argv.includes("--two-only")) {
  await walkCanvasGame({
    game: "duosquad",
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

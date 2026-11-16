import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { start } from "./serve.js";
import { toneOf, toneShares, walkCanvasGame } from "./canvas-walk.js";

const OUT = "/private/tmp/ftgames-robotrumble-shots";

const round = (s) =>
  s.evaluate(() => {
    const { round } = document.getElementById("view").game.state;
    return round && { held: [...round.held], mine: [...round.mine], theirs: [...round.theirs], hits: [...round.bout.hits], window: round.settings.window, period: round.settings.period, kind: round.kind };
  });

const waitFor = (s, what, tries = 80) =>
  s.evaluate(
    async ({ what, tries }) => {
      const view = document.getElementById("view").game;
      const done = () => (what === "end" ? view.state.screen === "end" : view.state.round?.mine.length >= what);
      for (let at = 0; at < tries && !done(); at += 1) await new Promise((resolve) => setTimeout(resolve, 100));
      return done();
    },
    { what, tries },
  );

const finishSoon = (s) =>
  s.evaluate(() => {
    const { round } = document.getElementById("view").game.state;
    round.settings = { ...round.settings, exchanges: round.mine.length + 1 };
  });

async function steps(s, { check, label }) {
  await s.tap("play");
  await s.page.waitForTimeout(600);
  await s.shot("2-countdown");
  await s.page.waitForTimeout(2700);
  await s.shot("3-hint");
  await s.tap("glove", 0);
  await s.shot("4-glove-chosen");
  await check(`${label}: a tap lights the glove`, async () => assert.deepEqual((await round(s)).held[0], 1));
  await waitFor(s, 1);
  await s.page.waitForTimeout(420);
  await s.shot("5-moves-shown");
  await check(`${label}: the glove is played when the window closes`, async () => assert.equal((await round(s)).mine[0], "g"));
  await s.page.waitForTimeout(900);
  await s.tap("glove", 0);
  await s.tap("boot", 0);
  await s.shot("6-shield-chosen");
  await check(`${label}: both buttons raise the shield`, async () => assert.equal((await round(s)).held[0], 3));
  await waitFor(s, 2);
  await s.page.waitForTimeout(250);
  await s.shot("7-shield-shown");
  await s.tap("pause");
  await s.shot("8-pause");
  await s.tap("resume");
  await s.tap("speaker");
  await s.shot("9-volume");
  await s.tap("speaker");
  await finishSoon(s);
  await check(`${label}: a round ends on the star card`, async () => assert.equal(await waitFor(s, "end", 120), true));
  await s.page.waitForTimeout(400);
  await s.shot("10-end");
  await s.tap("home");
  await s.tap("looks");
  await s.shot("11-robots");
  await s.tap("tab", "stage");
  await s.shot("12-stages");
  await s.tap("done");
  await s.tap("avatar");
  await s.shot("13-avatar");
}

async function pairSteps(s, { check, label }) {
  await s.tap("variant", "pair");
  await s.tap("play");
  await s.page.waitForTimeout(3300);
  await s.tap("glove", 0);
  await s.tap("boot", 1);
  await s.shot("2-both-chosen");
  await waitFor(s, 1);
  await s.page.waitForTimeout(420);
  await s.shot("3-glove-beats-boot");
  await check(`${label}: each player's own buttons choose their robot's move`, async () => {
    const seen = await round(s);
    assert.deepEqual([seen.mine[0], seen.theirs[0], seen.hits], ["g", "b", [1, 0]]);
  });
}

const robotPixels = (s) =>
  s.evaluate(() => {
    const canvas = document.querySelector("canvas");
    const ratio = canvas.width / canvas.getBoundingClientRect().width;
    const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    const { layout } = document.getElementById("view").game.state;
    const found = [];
    for (let dy = -6; dy <= 6; dy += 3) for (let dx = -14; dx <= 14; dx += 4) {
      const at = (Math.round((layout.ground - layout.size * 0.33 + dy) * ratio) * canvas.width + Math.round((layout.home[0] + dx) * ratio)) * 4;
      found.push([data[at], data[at + 1], data[at + 2]]);
    }
    return found;
  });

async function playScreen(s, { check, label, theme }) {
  await s.tap("play");
  await s.evaluate(() => {
    const view = document.getElementById("view").game;
    view.state.taught = true;
    view.state.round.startAt = performance.now() + 60_000;
  });
  await s.page.waitForTimeout(400);
  await s.shot("play");
  const shares = toneShares(await s.samples());
  const chroma = (await robotPixels(s)).map((pixel) => toneOf(pixel)[1]);
  const most = Math.max(...chroma);
  console.log(`${label}: L>=0.8 ${shares.bright}%, L>=0.6 ${shares.light}%, vivid ${shares.vivid}%; robot chroma up to ${most.toFixed(3)}`);
  await check(`${label}: the robot keeps its full colour`, async () => assert.ok(most >= 0.09, `robot chroma ${most.toFixed(3)}`));
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
  await page.goto(`${base}/?game=robotrumble&lang=en&bare&theme=mono-dark&screen=384x853`);
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
    return { screen: view.state.screen, phase: view.duel.phase, seat: round?.seat ?? null, step: round?.step ?? 0, mine: round ? [...round.mine] : [], theirs: round ? [...round.theirs] : [], hits: round ? [...round.bout.hits] : [], outcome };
  });
  const locked = (side, count) => t.frame(side).evaluate(async (wanted) => {
    const view = document.getElementById("view").game;
    for (let at = 0; at < 80 && (view.state.round?.bout.count ?? 0) < wanted; at += 1) await new Promise((resolve) => setTimeout(resolve, 100));
  }, count);
  await t.shot("1-both-home");
  await t.press("a", "play");
  await t.page.waitForTimeout(600);
  await t.shot("2-a-waiting-b-sees-ready");
  await t.press("b", "play");
  await t.page.waitForTimeout(1200);
  await t.shot("3-countdown");
  await t.page.waitForTimeout(2300);
  await t.press("a", "glove");
  await t.press("b", "boot");
  await t.shot("4-each-chose-in-secret");
  await check("two phones: a move chosen on one phone is not on the other before the window closes", async () => {
    const [a, b] = [await state("a"), await state("b")];
    assert.deepEqual([a.theirs, b.theirs], [[], []]);
  });
  await Promise.all([locked("a", 1), locked("b", 1)]);
  await t.page.waitForTimeout(450);
  await t.shot("5-both-moves-shown");
  const [a, b] = [await state("a"), await state("b")];
  await check("two phones: both show the same exchange, each from its own side", async () => {
    assert.deepEqual([a.screen, b.screen], ["play", "play"]);
    assert.equal(a.seat + b.seat, 1);
    assert.deepEqual([a.mine[0], a.theirs[0], b.mine[0], b.theirs[0]], ["g", "b", "b", "g"]);
    assert.deepEqual([a.hits, b.hits], [[1, 0], [0, 1]]);
  });
  await t.press("a", "pause");
  await t.page.waitForTimeout(600);
  await t.shot("6-a-paused-b-frozen");
  const frozen = (await state("b")).step;
  await t.page.waitForTimeout(800);
  await check("two phones: a pause on one phone freezes the other", async () => assert.equal((await state("b")).step, frozen));
  await t.press("a", "resume");
  for (const side of ["a", "b"]) {
    await t.frame(side).evaluate(() => {
      const { round } = document.getElementById("view").game.state;
      round.settings = { ...round.settings, exchanges: 4 };
    });
  }
  await t.page.waitForTimeout(12_000);
  await t.shot("7-both-end");
  const [endA, endB] = [await state("a"), await state("b")];
  await check("two phones: both end on the star card with the same score, mirrored", async () => {
    assert.deepEqual([endA.screen, endB.screen], ["end", "end"]);
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
    game: "robotrumble",
    out: OUT,
    modes: [
      { name: "flick", fill: true, query: "&solo" },
      { name: "flick", fill: false, query: "&solo", engines: ["chromium"] },
      { name: "alone", fill: false, query: "&alone", engines: ["chromium"] },
      { name: "pair", fill: true, query: "&alone", engines: ["chromium"], pair: true },
    ],
    steps: (s, more) => (s.out.endsWith("-pair") ? pairSteps(s, more) : steps(s, more)),
    themes: ["mono-dark", "mono-light", "ember-dark"].map((name) => ({ name, query: "&solo", run: playScreen })),
  });
}
if (!process.argv.includes("--webkit")) await walkTwoPhones();

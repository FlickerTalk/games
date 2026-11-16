import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { start } from "./serve.js";
import { toneOf, toneShares, walkCanvasGame } from "./canvas-walk.js";

const OUT = "/private/tmp/ftgames-bumperring-shots";
const PICK_SCREEN_OVERFLOWS_THE_SMALLEST_ROOM = { inside: false };

const game = (s, run, arg) => s.evaluate(run, arg);

async function holdDash(s, ms) {
  const dash = (await s.targets()).find((one) => one.kind === "dash");
  await s.page.mouse.move(...(await s.at(dash.x + dash.w / 2, dash.y + dash.h / 2)));
  await s.page.mouse.down();
  await s.page.waitForTimeout(ms);
}

const finishSoon = (s) =>
  game(s, async () => {
    const view = document.getElementById("view").game;
    const { match } = view.state.round;
    match.roundSteps = match.step + 60;
    for (let tries = 0; tries < 60 && view.state.screen !== "end"; tries += 1) await new Promise((resolve) => setTimeout(resolve, 100));
    return view.state.screen;
  });

const dropRival = (s) =>
  game(s, () => {
    const { round } = document.getElementById("view").game.state;
    Object.assign(round.match.bodies[1 - round.seat], { x: 0.7, y: 0.5, vx: 2.2, vy: 1.4, safe: 0, out: 0 });
  });

async function steps(s, { check, label }) {
  await s.tap("play");
  await s.page.waitForTimeout(600);
  await s.shot("2-countdown");
  await s.page.waitForTimeout(2800);
  await s.shot("3-hint");
  await holdDash(s, 600);
  await s.shot("4-charging");
  await s.page.mouse.up();
  await s.page.waitForTimeout(160);
  await s.shot("5-dash");
  await check(`${label}: a held touch on the button charges a dash and the hand goes away`, async () => {
    const seen = await game(s, () => {
      const { state } = document.getElementById("view").game;
      const me = state.round.match.bodies[state.round.seat];
      return { taught: state.taught, moved: Math.hypot(me.x, me.y - 0.45) };
    });
    assert.equal(seen.taught, true);
    assert.ok(seen.moved > 0.1, `moved ${seen.moved}`);
  });
  await s.page.waitForTimeout(1200);
  await dropRival(s);
  await s.page.waitForTimeout(450);
  await s.shot("6-splash");
  await s.page.waitForTimeout(900);
  await s.shot("7-in-the-water");
  await check(`${label}: a rival in the water is a shell for the player`, async () => {
    const lost = await game(s, () => document.getElementById("view").game.state.round.match.bodies[1].lost);
    assert.ok(lost >= 1, `falls ${lost}`);
  });
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
  await s.shot("11-places");
  await s.tap("tab", "ring");
  await s.shot("12-rings");
  await s.tap("done");
  await s.tap("avatar", undefined, PICK_SCREEN_OVERFLOWS_THE_SMALLEST_ROOM);
  await s.shot("13-avatar");
}

const ringPixels = (s) =>
  game(s, () => {
    const canvas = document.querySelector("canvas");
    const ratio = canvas.width / canvas.getBoundingClientRect().width;
    const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    const { round, layout } = document.getElementById("view").game.state;
    const { x, y, r } = layout.platform;
    const me = round.match.bodies[round.seat];
    const spot = [x + me.x * r, y + me.y * r * 0.58 - 0.03 * r];
    const found = [];
    for (let dy = -6; dy <= 6; dy += 2) for (let dx = -Math.round(0.2 * r); dx <= 0.2 * r; dx += 3) {
      const at = (Math.round((spot[1] + dy) * ratio) * canvas.width + Math.round((spot[0] + dx) * ratio)) * 4;
      found.push([data[at], data[at + 1], data[at + 2]]);
    }
    return found;
  });

async function playScreen(s, { check, label, theme }) {
  await s.tap("play");
  await s.page.waitForTimeout(3600);
  await game(s, () => (document.getElementById("view").game.state.taught = true));
  await s.page.waitForTimeout(300);
  await s.shot("play");
  const shares = toneShares(await s.samples());
  const most = Math.max(...(await ringPixels(s)).map((pixel) => toneOf(pixel)[1]));
  console.log(`${label}: L>=0.8 ${shares.bright}%, L>=0.6 ${shares.light}%, vivid ${shares.vivid}%; ring chroma up to ${most.toFixed(3)}`);
  await check(`${label}: the player's ring keeps its full colour`, async () => assert.ok(most >= 0.09, `ring chroma ${most.toFixed(3)}`));
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
  await page.goto(`${base}/?game=bumperring&lang=en&bare&theme=mono-dark&screen=384x853`);
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
    const bodies = round?.match.bodies.map(({ x, y, lost }) => ({ x, y, lost })) ?? [];
    return { screen: view.state.screen, phase: view.duel.phase, seat: round?.seat ?? null, step: round?.match.step ?? 0, outcome, bodies };
  });
  const aim = (side) => t.frame(side).evaluate(() => {
    const { round } = document.getElementById("view").game.state;
    Object.assign(round.match.bodies[round.seat], { ax: 0, ay: round.seat === 0 ? -1 : 1 });
    const view = document.getElementById("view").game;
    const dash = view.targets().find((one) => one.kind === "dash");
    view.pointer({ type: "down", x: dash.x + 10, y: dash.y + 10, id: 9 });
  });
  const letGo = (side) => t.frame(side).evaluate(() => document.getElementById("view").game.pointer({ type: "up", x: 0, y: 0, id: 9 }));
  await t.shot("1-both-home");
  await t.press("a", "play");
  await t.page.waitForTimeout(600);
  await t.shot("2-a-waiting-b-sees-ready");
  await t.press("b", "play");
  await t.page.waitForTimeout(1200);
  await t.shot("3-countdown");
  await t.page.waitForTimeout(2600);
  const [a, b] = [await state("a"), await state("b")];
  await check("two phones: both play the same round, each seeing itself at the near side", async () => {
    assert.deepEqual([a.screen, b.screen], ["play", "play"]);
    assert.equal(a.seat + b.seat, 1);
    assert.ok(a.step > 20 && b.step > 20, `steps ${a.step} ${b.step}`);
  });
  for (const side of ["a", "b"]) await t.frame(side).evaluate(() => (document.getElementById("view").game.state.round.match.variant = "plain"));
  await aim("a");
  await t.page.waitForTimeout(950);
  await t.shot("4-a-charging-seen-by-b");
  await letGo("a");
  await t.page.waitForTimeout(450);
  await t.shot("5-a-shoves-b");
  await t.page.waitForTimeout(1500);
  await t.shot("6-b-in-the-water");
  const [hitA, hitB] = [await state("a"), await state("b")];
  await check("two phones: the shoved phone counts its own fall and the other learns it", async () => {
    assert.equal(hitB.bodies[hitB.seat].lost, 1);
    assert.equal(hitA.bodies[hitB.seat].lost, 1);
    assert.equal(hitA.bodies[hitA.seat].lost, 0);
  });
  await t.press("a", "pause");
  await t.page.waitForTimeout(600);
  await t.shot("7-a-paused-b-frozen");
  const frozen = (await state("b")).step;
  await t.page.waitForTimeout(800);
  await check("two phones: a pause on one phone freezes the other", async () => assert.equal((await state("b")).step, frozen));
  await t.press("a", "resume");
  await t.frame("a").evaluate(() => {
    const { match } = document.getElementById("view").game.state.round;
    match.roundSteps = match.step + 120;
  });
  await t.page.waitForTimeout(5000);
  await t.shot("8-both-end");
  const [endA, endB] = [await state("a"), await state("b")];
  await check("two phones: both end on the star card with the same score, mirrored", async () => {
    assert.deepEqual([endA.screen, endB.screen], ["end", "end"]);
    assert.equal(endA.outcome.mine, endB.outcome.theirs);
    assert.equal(endA.outcome.theirs, endB.outcome.mine);
    assert.equal(endA.outcome.mine, 1);
  });
  await check("two phones: no errors", async () => assert.deepEqual(t.problems, []));
  await t.browser.close();
  await t.server.close();
  for (const [status, name, why] of results) console.log(`${status === "ok" ? "ok  " : "FAIL"} ${name}${why ? `: ${why}` : ""}`);
  if (results.some(([status]) => status !== "ok")) process.exitCode = 1;
}

if (!process.argv.includes("--two-only")) {
  await walkCanvasGame({
    game: "bumperring",
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

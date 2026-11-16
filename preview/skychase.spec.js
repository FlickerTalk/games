import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { start } from "./serve.js";
import { toneOf, toneShares, walkCanvasGame } from "./canvas-walk.js";

const OUT = "/private/tmp/ftgames-skychase-shots";
const PICK_SCREEN_OVERFLOWS_THE_SMALLEST_ROOM = { inside: false };
const FULL_SKY = { clouds: [{ x: 0.72, y: 0.25, r: 0.15 }, { x: 0.2, y: 1.15, r: 0.14 }], wind: { y: 0.82, tall: 0.24, push: 0.11 }, ring: { x: 0.25, y: 0.45, r: 0.1 }, airship: { x: 0.78, y: 1.0, r: 0.12, drift: 0.035 } };

const game = (s, run, arg) => s.evaluate(run, arg);

async function holdOnSky(s, across, down, ms) {
  const { x, y, w, h } = await game(s, () => document.getElementById("view").game.state.layout.arena);
  await s.page.mouse.move(...(await s.at(x + w * across, y + h * down)));
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

const stage = (s, sky) =>
  game(s, (full) => {
    const { round } = document.getElementById("view").game.state;
    round.mind = null;
    round.match.sky = full;
    const [mine, rival] = [round.match.crafts[round.seat], round.match.crafts[1 - round.seat]];
    Object.assign(rival, { x: 0.5, y: 0.55, hx: 0, hy: -1, down: false, pace: 1, safe: 0, lock: 0 });
    Object.assign(mine, { x: 0.5, y: 0.8, hx: 0, hy: -1, safe: 0, lock: 0 });
  }, sky);

async function steps(s, { check, label }) {
  await s.tap("play");
  await s.page.waitForTimeout(600);
  await s.shot("2-countdown");
  await s.page.waitForTimeout(2800);
  await s.shot("3-hint");
  await holdOnSky(s, 0.85, 0.5, 700);
  await s.shot("4-turning");
  await s.page.mouse.up();
  await s.page.waitForTimeout(160);
  await check(`${label}: a finger held on the sky turns the aircraft and the hand goes away`, async () => {
    const seen = await game(s, () => {
      const { state } = document.getElementById("view").game;
      const me = state.round.match.crafts[state.round.seat];
      return { taught: state.taught, turned: Math.abs(me.hx) };
    });
    assert.equal(seen.taught, true);
    assert.ok(seen.turned > 0.2, `turned ${seen.turned}`);
  });
  await stage(s, FULL_SKY);
  await s.page.waitForTimeout(350);
  await s.shot("5-ring-closing");
  await s.page.waitForTimeout(450);
  await s.shot("6-pop");
  await check(`${label}: staying behind the other aircraft pops one of its balloons`, async () => {
    const lost = await game(s, () => document.getElementById("view").game.state.round.match.crafts[1].lost);
    assert.ok(lost >= 1, `popped ${lost}`);
  });
  await s.tap("pause");
  await s.shot("7-pause");
  await s.tap("resume");
  await s.tap("speaker");
  await s.shot("8-volume");
  await s.tap("speaker");
  await game(s, () => {
    const { round } = document.getElementById("view").game.state;
    Object.assign(round.match.crafts[1 - round.seat], { lost: 3, out: 1 });
  });
  await s.page.waitForTimeout(700);
  await s.shot("9-parachute");
  await check(`${label}: a round ends on the star card`, async () => assert.equal(await finishSoon(s), "end"));
  await s.page.waitForTimeout(400);
  await s.shot("10-end");
  await s.tap("home");
  await s.tap("looks");
  await s.shot("11-planes");
  await s.tap("tab", "helicopter");
  await s.shot("12-helicopters");
  await s.tap("look", 0);
  await s.tap("look", 0);
  await s.shot("13-helicopter-recoloured");
  await s.tap("done");
  await s.shot("14-home-helicopter");
  await s.tap("avatar", undefined, PICK_SCREEN_OVERFLOWS_THE_SMALLEST_ROOM);
  await s.shot("15-avatar");
}

const craftPixels = (s) =>
  game(s, () => {
    const canvas = document.querySelector("canvas");
    const ratio = canvas.width / canvas.getBoundingClientRect().width;
    const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    const { round, layout } = document.getElementById("view").game.state;
    const { arena } = layout;
    const me = round.match.crafts[round.seat];
    const wrap = (value, size) => value - Math.floor(value / size) * size;
    const [u, v] = [wrap(me.x, 1), wrap(me.y, 1.4)];
    const spot = arena.side ? [arena.x + v * arena.unit, arena.y + (1 - u) * arena.unit] : [arena.x + u * arena.unit, arena.y + v * arena.unit];
    const reach = Math.round(arena.unit * 0.08);
    const found = [];
    for (let dy = -reach; dy <= reach; dy += 3) for (let dx = -reach; dx <= reach; dx += 3) {
      const at = (Math.round((spot[1] + dy) * ratio) * canvas.width + Math.round((spot[0] + dx) * ratio)) * 4;
      found.push([data[at], data[at + 1], data[at + 2]]);
    }
    return found;
  });

async function playScreen(s, { check, label, theme }) {
  await s.tap("play");
  await s.page.waitForTimeout(3600);
  await game(s, () => (document.getElementById("view").game.state.taught = true));
  await stage(s, FULL_SKY);
  await s.page.waitForTimeout(300);
  await s.shot("play");
  const shares = toneShares(await s.samples());
  const most = Math.max(...(await craftPixels(s)).map((pixel) => toneOf(pixel)[1]));
  console.log(`${label}: L>=0.8 ${shares.bright}%, L>=0.6 ${shares.light}%, vivid ${shares.vivid}%; aircraft chroma up to ${most.toFixed(3)}`);
  await check(`${label}: the player's aircraft keeps its full colour`, async () => assert.ok(most >= 0.09, `aircraft chroma ${most.toFixed(3)}`));
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
  await page.goto(`${base}/?game=skychase&lang=en&bare&theme=mono-dark&screen=384x853`);
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

function collector() {
  const results = [];
  const check = async (name, run) => {
    try {
      await run();
      results.push(["ok", name]);
    } catch (error) {
      results.push(["FAIL", name, error.message.split("\n")[0]]);
    }
  };
  return { results, check };
}

const stateOf = (t, side) => t.frame(side).evaluate(() => {
  const view = document.getElementById("view").game;
  const { round, outcome } = view.state;
  const crafts = round?.match.crafts.map(({ x, y, hx, lost, lock }) => ({ x, y, hx, lost, lock })) ?? [];
  return { screen: view.state.screen, phase: view.duel.phase, seat: round?.seat ?? null, step: round?.match.step ?? 0, sky: JSON.stringify(round?.match.sky ?? null), outcome, crafts };
});

const place = (t, side, where) => t.frame(side).evaluate((at) => {
  const { round } = document.getElementById("view").game.state;
  Object.assign(round.match, { sky: { clouds: [], wind: null, ring: null, airship: null }, trails: [[], []] });
  Object.assign(round.match.crafts[round.seat], { ...at, hx: 0, hy: -1, safe: 0, lock: 0 });
}, where);

async function walkTwoPhones() {
  const { results, check } = collector();
  const t = await twoPhones();
  await t.shot("1-both-home");
  await t.press("a", "play");
  await t.page.waitForTimeout(600);
  await t.shot("2-a-waiting-b-sees-ready");
  await t.press("b", "play");
  await t.page.waitForTimeout(1200);
  await t.shot("3-countdown");
  await t.page.waitForTimeout(2600);
  const [a, b] = [await stateOf(t, "a"), await stateOf(t, "b")];
  await check("two phones: both fly in the same sky, each owning one aircraft", async () => {
    assert.deepEqual([a.screen, b.screen], ["play", "play"]);
    assert.equal(a.seat + b.seat, 1);
    assert.equal(a.sky, b.sky);
    assert.ok(a.step > 20 && b.step > 20, `steps ${a.step} ${b.step}`);
  });
  await place(t, "b", { x: 0.5, y: 0.55 });
  await place(t, "a", { x: 0.5, y: 0.78 });
  await t.page.waitForTimeout(700);
  await t.shot("4-a-behind-b-ring-closing");
  await t.page.waitForTimeout(1300);
  await t.shot("5-b-lost-a-balloon");
  const [hitA, hitB] = [await stateOf(t, "a"), await stateOf(t, "b")];
  await check("two phones: the phone aimed at pops its own balloon and the hunter learns it", async () => {
    assert.ok(hitB.crafts[hitB.seat].lost >= 1, `b lost ${hitB.crafts[hitB.seat].lost}`);
    assert.equal(hitA.crafts[hitB.seat].lost, hitB.crafts[hitB.seat].lost);
    assert.equal(hitA.crafts[hitA.seat].lost, 0);
  });
  await t.press("a", "pause");
  await t.page.waitForTimeout(600);
  await t.shot("6-a-paused-b-frozen");
  const frozen = (await stateOf(t, "b")).step;
  await t.page.waitForTimeout(800);
  await check("two phones: a pause on one phone freezes the other", async () => assert.equal((await stateOf(t, "b")).step, frozen));
  await t.press("a", "resume");
  await t.frame("a").evaluate(() => {
    const { match } = document.getElementById("view").game.state.round;
    match.roundSteps = match.step + 120;
  });
  await t.page.waitForTimeout(5000);
  await t.shot("7-both-end");
  const [endA, endB] = [await stateOf(t, "a"), await stateOf(t, "b")];
  await check("two phones: both end on the star card with the same score, mirrored", async () => {
    assert.deepEqual([endA.screen, endB.screen], ["end", "end"]);
    assert.equal(endA.outcome.mine, endB.outcome.theirs);
    assert.equal(endA.outcome.theirs, endB.outcome.mine);
    assert.ok(endA.outcome.mine >= 1, `a popped ${endA.outcome.mine}`);
  });
  await check("two phones: no errors", async () => assert.deepEqual(t.problems, []));
  await t.browser.close();
  await t.server.close();
  for (const [status, name, why] of results) console.log(`${status === "ok" ? "ok  " : "FAIL"} ${name}${why ? `: ${why}` : ""}`);
  if (results.some(([status]) => status !== "ok")) process.exitCode = 1;
}

if (!process.argv.includes("--two-only")) {
  await walkCanvasGame({
    game: "skychase",
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

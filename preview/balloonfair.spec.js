import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { start } from "./serve.js";
import { toneOf, toneShares, walkCanvasGame } from "./canvas-walk.js";

const OUT = "/private/tmp/ftgames-balloonfair-shots";

const toolFor = (label) => (label.endsWith("-alone") ? "bow" : label.includes("-room-") ? "blaster" : "popgun");

const inView = () => {
  const view = document.getElementById("view").game;
  const { field } = view.state.layout;
  return view.onShow().filter((one) => one.balloon.kind !== "cloud" && one.y > field.y + one.r && one.y < field.y + field.h - one.r).map(({ balloon, x, y, r }) => ({ id: balloon.id, x, y, r }));
};

const read = (s) =>
  s.evaluate(() => {
    const view = document.getElementById("view").game;
    const { round } = view.state;
    return { screen: view.state.screen, score: round ? round.tally.scores[round.seat] : 0, taught: view.state.taught, shots: round ? round.tool.shots.length : 0, tool: view.state.tool };
  });

async function balloon(s) {
  for (let tries = 0; tries < 50; tries += 1) {
    const [found] = await s.evaluate(inView);
    if (found) return found;
    await s.page.waitForTimeout(100);
  }
  throw new Error("no balloon came up");
}

async function useToy(s, tool, { check, label }) {
  const found = await balloon(s);
  if (tool === "bow") {
    const { field } = await s.evaluate(() => document.getElementById("view").game.state.layout);
    const from = [field.x + field.w / 2, field.y + field.h * 0.45];
    await s.page.mouse.move(...(await s.at(...from)));
    await s.page.mouse.down();
    await s.page.mouse.move(...(await s.at(from[0] + 6, from[1] + 70)), { steps: 8 });
    await s.shot("4-aiming");
    await s.page.mouse.up();
    await s.page.waitForTimeout(100);
    await s.shot("5-arrow");
    await check(`${label}: pulling back and letting go shoots the bow`, async () => assert.deepEqual((await read(s)).taught, ["bow"]));
    return;
  }
  await s.page.mouse.click(...(await s.at(found.x, found.y)));
  await s.page.waitForTimeout(tool === "blaster" ? 220 : 180);
  await s.shot("4-shot");
  await s.page.waitForTimeout(300);
  await s.shot("5-after");
  await check(`${label}: a tap on a balloon pops it with the ${tool}`, async () => {
    const seen = await read(s);
    assert.ok(seen.score >= 1, `score ${seen.score}`);
    assert.deepEqual(seen.taught, [tool]);
  });
}

const finishSoon = (s) =>
  s.evaluate(async () => {
    const view = document.getElementById("view").game;
    const { round } = view.state;
    round.roundSteps = round.step + 30;
    for (let tries = 0; tries < 60 && view.state.screen !== "end"; tries += 1) await new Promise((resolve) => setTimeout(resolve, 100));
    return view.state.screen;
  });

async function steps(s, { check, label }) {
  const tool = toolFor(label);
  await s.tap("variant", tool);
  await s.shot("1-home-toy");
  await s.tap("play");
  await s.page.waitForTimeout(600);
  await s.shot("2-countdown");
  await s.page.waitForTimeout(2600);
  await balloon(s);
  await s.page.waitForTimeout(700);
  await s.shot("3-hint");
  await useToy(s, tool, { check, label });
  await s.page.waitForTimeout(1500);
  await s.shot("6-round");
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
  await s.shot("10-fairs");
  await s.tap("done");
  await s.tap("avatar");
  await s.shot("11-avatar");
}

const balloonPixels = (s) =>
  s.evaluate(() => {
    const view = document.getElementById("view").game;
    const { field } = view.state.layout;
    const found = view.onShow().find((one) => ["round", "oval", "big"].includes(one.balloon.kind) && one.y > field.y + one.r && one.y < field.y + field.h - one.r);
    if (!found) return [];
    const canvas = document.querySelector("canvas");
    const ratio = canvas.width / canvas.getBoundingClientRect().width;
    const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    const pixels = [];
    for (let dy = -found.r * 0.3; dy <= found.r * 0.3; dy += 3) for (let dx = 0; dx <= found.r * 0.4; dx += 3) {
      const at = (Math.round((found.y + dy) * ratio) * canvas.width + Math.round((found.x + dx) * ratio)) * 4;
      pixels.push([data[at], data[at + 1], data[at + 2]]);
    }
    return pixels;
  });

async function playScreen(s, { check, label, theme }) {
  await s.tap("play");
  await s.page.waitForTimeout(3600);
  await s.evaluate(() => {
    document.getElementById("view").game.state.taught = ["popgun", "blaster", "bow"];
  });
  await s.page.waitForTimeout(2500);
  await balloon(s);
  const chroma = (await balloonPixels(s)).map((pixel) => toneOf(pixel)[1]);
  await s.shot("play");
  const shares = toneShares(await s.samples());
  const most = Math.max(0, ...chroma);
  console.log(`${label}: L>=0.8 ${shares.bright}%, L>=0.6 ${shares.light}%, vivid ${shares.vivid}%; balloon chroma up to ${most.toFixed(3)}`);
  await check(`${label}: the balloons keep their full colour`, async () => assert.ok(most >= 0.09, `balloon chroma ${most.toFixed(3)}`));
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
  await page.goto(`${base}/?game=balloonfair&lang=en&bare&theme=mono-dark&screen=384x853`);
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

const popOne = (frame) =>
  frame.evaluate(() => {
    const view = document.getElementById("view").game;
    const { field } = view.state.layout;
    const found = view.onShow().find((one) => ["round", "oval"].includes(one.balloon.kind) && one.y > field.y + one.r && one.y < field.y + field.h - one.r);
    if (!found) return null;
    view.pointer({ type: "down", x: found.x, y: found.y, id: 1 });
    view.pointer({ type: "up", x: found.x, y: found.y, id: 1 });
    return found.balloon.id;
  });

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
    const pops = round ? [...round.tally.pops].map(([id, pop]) => [id, pop.seat]) : [];
    return { screen: view.state.screen, phase: view.duel.phase, seat: round?.seat ?? null, step: round?.step ?? 0, scores: round?.tally.scores ?? null, pops, outcome };
  });
  await t.shot("1-both-home");
  await t.press("b", "variant", "blaster");
  await t.press("a", "play");
  await t.page.waitForTimeout(600);
  await t.shot("2-a-waiting-b-sees-ready");
  await t.press("b", "play");
  await t.page.waitForTimeout(1200);
  await t.shot("3-countdown");
  await t.page.waitForTimeout(5000);
  await t.shot("4-same-balloons");
  const [a, b] = [await state("a"), await state("b")];
  await check("two phones: both play the same round", async () => {
    assert.deepEqual([a.screen, b.screen], ["play", "play"]);
    assert.equal(a.seat + b.seat, 1);
    assert.ok(a.step > 100 && b.step > 100, `steps ${a.step} ${b.step}`);
  });
  const popped = await popOne(t.frame("a"));
  await t.page.waitForTimeout(350);
  await t.shot("5-a-pops-b-sees-it");
  await t.page.waitForTimeout(450);
  const [afterA, afterB] = [await state("a"), await state("b")];
  await check("two phones: a balloon popped on one phone is gone on the other, counted for whoever popped it", async () => {
    assert.notEqual(popped, null);
    assert.deepEqual(afterB.pops.find(([id]) => id === popped), [popped, afterA.seat]);
    assert.deepEqual(afterA.scores, afterB.scores);
    assert.equal(afterA.scores[afterA.seat], 1);
  });
  await t.press("a", "pause");
  await t.page.waitForTimeout(600);
  await t.shot("6-a-paused-b-frozen");
  const frozen = (await state("b")).step;
  await t.page.waitForTimeout(800);
  await check("two phones: a pause on one phone freezes the other", async () => assert.equal((await state("b")).step, frozen));
  await t.press("a", "resume");
  await t.page.waitForTimeout(500);
  await popOne(t.frame("b"));
  await t.frame("a").evaluate(() => {
    const { round } = document.getElementById("view").game.state;
    round.roundSteps = round.step + 60;
  });
  await t.page.waitForTimeout(5000);
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
    game: "balloonfair",
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

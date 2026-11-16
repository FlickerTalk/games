import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { start } from "./serve.js";
import { toneOf, toneShares, walkCanvasGame } from "./canvas-walk.js";

const OUT = "/private/tmp/ftgames-foamduel-shots";
const PICK_SCREEN_OVERFLOWS_THE_SMALLEST_ROOM = { inside: false };
// a tap sooner than this after the bell is taken for a tap before it
const HUMAN_MS = 170;

const read = (frame) =>
  frame.evaluate(() => {
    const view = document.getElementById("view").game;
    const { round, outcome } = view.state;
    return {
      screen: view.state.screen,
      kind: round?.kind ?? null,
      seat: round?.seat ?? null,
      step: round?.step ?? 0,
      scores: round?.scores ?? null,
      claims: round ? round.claims.map((list) => list.map(({ x, r }) => [x, r])) : null,
      verdicts: round ? [...round.verdicts].map(([x, { win, early }]) => ({ x, win, early })) : [],
      exchanges: round?.schedule.length ?? 0,
      taught: view.state.taught,
      outcome,
    };
  });

const phase = (frame, wanted, from = 0) =>
  frame.evaluate(
    ([phaseWanted, least]) =>
      new Promise((resolve, reject) => {
        const view = document.getElementById("view").game;
        const started = performance.now();
        const look = () => {
          const { round } = view.state;
          const exchange = round?.schedule.find((one) => round.step >= one.ready && round.step < one.end);
          const open = exchange && exchange.x >= least && !round.verdicts.has(exchange.x);
          const waiting = open && round.step < exchange.signal - 20;
          const bell = open && round.shown.has(exchange.x) && round.step < exchange.close;
          if (phaseWanted === "wait" ? waiting : bell) return resolve(exchange.x);
          if (performance.now() - started > 20_000) return reject(new Error(`no ${phaseWanted} came`));
          return requestAnimationFrame(look);
        };
        look();
      }),
    [wanted, from],
  );

async function strikeOn(s, pad = 0) {
  const found = (await s.targets()).find((one) => one.kind === "strike" && one.value === pad);
  await s.page.mouse.click(...(await s.at(found.x + found.w / 2, found.y + found.h / 2)));
}

const finishSoon = (frame) =>
  frame.evaluate(async () => {
    const view = document.getElementById("view").game;
    const { round } = view.state;
    round.roundSteps = round.step + 30;
    for (let tries = 0; tries < 60 && view.state.screen !== "end"; tries += 1) await new Promise((resolve) => setTimeout(resolve, 100));
    return view.state.screen;
  });

async function exchanges(s, { check, label, pair }) {
  const frame = s.inner();
  await phase(frame, "wait");
  await s.shot("3-swords-up-hint");
  const first = await phase(frame, "bell");
  await s.page.waitForTimeout(HUMAN_MS);
  await strikeOn(s);
  await s.page.waitForTimeout(90);
  await s.shot("4-strike");
  await s.page.waitForTimeout(260);
  await s.shot("5-popped");
  await check(`${label}: a tap after the bell pops the other knight's balloon`, async () => {
    const seen = await read(frame);
    assert.deepEqual(seen.verdicts.find((one) => one.x === first)?.win, [true, false]);
    assert.equal(seen.scores[0], 1);
    assert.equal(seen.taught, true);
  });
  const second = await phase(frame, "wait", first + 1);
  await strikeOn(s, pair ? 1 : 0);
  await s.page.waitForTimeout(260);
  await s.shot("6-stumble");
  await check(`${label}: a tap before the bell is a stumble that gives the exchange away`, async () => {
    const seen = await read(frame);
    const verdict = seen.verdicts.find((one) => one.x === second);
    assert.deepEqual(verdict?.early, pair ? [false, true] : [true, false]);
    assert.deepEqual(verdict?.win, pair ? [true, false] : [false, true]);
  });
  await phase(frame, "bell", second + 1);
  await s.shot("7-bell");
}

async function steps(s, { check, label }) {
  const pair = label.endsWith("-alone");
  if (pair) {
    await s.tap("variant", "pair");
    await s.shot("1-home-two-players");
  }
  await s.tap("play");
  await s.page.waitForTimeout(600);
  await s.shot("2-countdown");
  await exchanges(s, { check, label, pair });
  await s.tap("pause");
  await s.shot("8-pause");
  await s.tap("resume");
  await s.tap("speaker");
  await s.shot("9-volume");
  await s.tap("speaker");
  await check(`${label}: a round ends on the star card`, async () => assert.equal(await finishSoon(s.inner()), "end"));
  await s.page.waitForTimeout(400);
  await s.shot("10-end");
  await s.tap("home");
  await s.tap("looks");
  await s.shot("11-swords");
  await s.tap("tab", "scenery");
  await s.shot("12-places");
  await s.tap("done");
  await s.tap("avatar", undefined, PICK_SCREEN_OVERFLOWS_THE_SMALLEST_ROOM);
  await s.shot("13-avatar");
}

const balloonAreas = (s) =>
  s.evaluate(() => {
    const { layout } = document.getElementById("view").game.state;
    const { knights, size, ground } = layout;
    return knights.map(({ x }) => ({ x: x - size * 0.06, y: ground - size * 1.3, w: size * 0.12, h: size * 0.1 }));
  });

async function playScreen(s, { check, label, theme }) {
  const scenery = { "mono-dark": "castle", "mono-light": "pillows", "ember-dark": "treehouse" }[theme.name];
  await s.evaluate((look) => {
    const view = document.getElementById("view").game;
    view.state.progress = { ...view.state.progress, received: ["pillows", "wavy", "treehouse", "long"], chosen: { sword: "wavy", scenery: look } };
    view.state.taught = true;
  }, scenery);
  await s.tap("play");
  await phase(s.inner(), "bell");
  const chroma = [];
  for (const area of await balloonAreas(s)) chroma.push(Math.max(0, ...(await s.samples(area, 2)).map((pixel) => toneOf(pixel)[1])));
  await s.shot("play");
  const shares = toneShares(await s.samples());
  console.log(`${label}: L>=0.8 ${shares.bright}%, L>=0.6 ${shares.light}%, vivid ${shares.vivid}%; balloon chroma ${chroma.map((one) => one.toFixed(3)).join(" and ")}`);
  await check(`${label}: both balloons keep their full colour`, async () => assert.ok(Math.min(...chroma) >= 0.09, `balloon chroma ${chroma.join(", ")}`));
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
  await page.goto(`${base}/?game=foamduel&lang=en&bare&theme=mono-dark&screen=384x853`);
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
  const [a, b] = [t.frame("a"), t.frame("b")];
  await t.shot("1-both-home");
  await t.press("a", "play");
  await t.page.waitForTimeout(600);
  await t.shot("2-a-waiting-b-sees-ready");
  await t.press("b", "play");
  await t.page.waitForTimeout(1200);
  await t.shot("3-countdown");
  const first = await phase(a, "bell");
  await t.shot("4-bell-on-both");
  const [seenA, seenB] = [await read(a), await read(b)];
  await check("two phones: both play the same duel", async () => {
    assert.deepEqual([seenA.screen, seenB.screen], ["play", "play"]);
    assert.equal(seenA.seat + seenB.seat, 1);
    assert.equal(seenA.exchanges, seenB.exchanges);
    assert.ok(seenA.exchanges > 5, `${seenA.exchanges} exchanges`);
  });
  await phase(a, "wait", first + 1);
  const second = await phase(a, "bell", first + 1);
  await t.page.waitForTimeout(HUMAN_MS);
  await t.press("a", "strike", 0);
  await t.page.waitForTimeout(700);
  await t.shot("5-a-strikes-b-laughs");
  const [afterA, afterB] = [await read(a), await read(b)];
  await check("two phones: the one who tapped pops the other's balloon on both phones, with the time their own phone measured", async () => {
    assert.deepEqual(afterA.verdicts.find((one) => one.x === second)?.win, [true, false]);
    assert.deepEqual(afterB.verdicts.find((one) => one.x === second)?.win, [false, true]);
    const [, r] = afterA.claims[afterA.seat].find(([x]) => x === second);
    assert.ok(r >= HUMAN_MS && r < 500, `reaction ${r}`);
    assert.deepEqual(afterB.claims[afterA.seat].find(([x]) => x === second), [second, r]);
  });
  const third = await phase(b, "wait", second + 1);
  await t.press("b", "strike", 0);
  await t.page.waitForTimeout(500);
  await t.shot("6-b-stumbles");
  await check("two phones: a tap before the bell is a stumble on both phones, and the other's point", async () => {
    const [nowA, nowB] = [await read(a), await read(b)];
    assert.deepEqual(nowB.verdicts.find((one) => one.x === third)?.early, [true, false]);
    assert.deepEqual(nowA.verdicts.find((one) => one.x === third)?.win, [true, false]);
  });
  await t.press("a", "pause");
  await t.page.waitForTimeout(600);
  await t.shot("7-a-paused-b-frozen");
  const frozen = (await read(b)).step;
  await t.page.waitForTimeout(800);
  await check("two phones: a pause on one phone freezes the other", async () => assert.equal((await read(b)).step, frozen));
  await t.press("a", "resume");
  await t.page.waitForTimeout(500);
  await a.evaluate(() => {
    const { round } = document.getElementById("view").game.state;
    round.roundSteps = round.step + 60;
  });
  await t.page.waitForTimeout(5000);
  await t.shot("8-both-end");
  const [endA, endB] = [await read(a), await read(b)];
  await check("two phones: both end on the star card with the same score, mirrored", async () => {
    assert.deepEqual([endA.screen, endB.screen], ["end", "end"]);
    assert.equal(endA.outcome.mine, endB.outcome.theirs);
    assert.equal(endA.outcome.theirs, endB.outcome.mine);
    assert.equal(endA.outcome.mine, 2);
  });
  await check("two phones: no errors", async () => assert.deepEqual(t.problems, []));
  await t.browser.close();
  await t.server.close();
  for (const [status, name, why] of results) console.log(`${status === "ok" ? "ok  " : "FAIL"} ${name}${why ? `: ${why}` : ""}`);
  if (results.some(([status]) => status !== "ok")) process.exitCode = 1;
}

if (!process.argv.includes("--two-only")) {
  await walkCanvasGame({
    game: "foamduel",
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

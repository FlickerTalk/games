// The games in the app's colours, in a real browser (Chromium, Playwright), in the preview harness's
// frames: with the app's variables on the frame's root the kit takes them — whatever the system's
// own light or dark — and without them it takes its fallback palette, light or dark; a theme switched
// with a game open repaints it at once, without reloading the frame.
//
// Run: npm run theme   (after npm run build)
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { start } from "./serve.js";

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

/** A computed colour as 0–255 channels: `rgb(…)`, or `color(srgb …)` (0–1) as color-mix gives. */
const rgb = (text) => {
  const values = text.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
  return text.startsWith("color(") ? values.map((one) => Math.round(one * 255)) : values;
};
const light = (text) => {
  const [r, g, b] = rgb(text);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};

/** One phone of the harness with a game open on its list, under `theme` and the system's `scheme`. */
async function open(game, { theme = "", scheme = "light" } = {}) {
  const context = await browser.newContext({ viewport: { width: 800, height: 820 }, colorScheme: scheme });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}/?game=${game}&bare&closed${theme ? `&theme=${theme}` : ""}`);
  await page.evaluate(() => globalThis.harness.open("a"));
  let frame;
  for (let tries = 0; !frame; tries += 1) {
    frame = page.frames().find((one) => one.url().endsWith(`/frame/${game}/a/frame.html`));
    if (!frame) await page.waitForTimeout(50);
    if (tries > 100) throw new Error("no frame");
  }
  await frame.waitForSelector(".ftg");
  const colours = () =>
    frame.evaluate(() => {
      const root = document.querySelector(".ftg");
      const style = getComputedStyle(root);
      return {
        ink: style.color,
        surface: getComputedStyle(document.querySelector(".ftg-hero, .ftg-row") ?? root).backgroundColor,
        themed: root.hasAttribute("data-themed"),
      };
    });
  return { context, page, frame, colours, errors };
}

for (const game of ["tictactoe", "fourinarow", "chess"]) {
  await check(`${game}: no app colours, light system → the fallback palette, light`, async () => {
    const { context, colours } = await open(game);
    const seen = await colours();
    assert.deepEqual(rgb(seen.ink), [10, 10, 10]);
    assert.equal(seen.themed, false);
    assert.ok(light(seen.surface) > 0.85, seen.surface);
    await context.close();
  });

  await check(`${game}: no app colours, dark system → the fallback palette, dark`, async () => {
    const { context, colours } = await open(game, { scheme: "dark" });
    const seen = await colours();
    assert.deepEqual(rgb(seen.ink), [245, 245, 245]);
    assert.ok(light(seen.surface) < 0.15, seen.surface);
    await context.close();
  });

  await check(`${game}: the app light (ember) on a dark system → the app's colours, nothing dark mixed in`, async () => {
    const { context, colours } = await open(game, { theme: "ember-light", scheme: "dark" });
    const seen = await colours();
    assert.equal(seen.themed, true);
    assert.deepEqual(rgb(seen.ink), [28, 23, 20]);
    assert.ok(light(seen.surface) > 0.85, seen.surface);
    await context.close();
  });

  await check(`${game}: the app dark (aurora) on a light system → the app's colours`, async () => {
    const { context, colours } = await open(game, { theme: "aurora-dark", scheme: "light" });
    const seen = await colours();
    assert.deepEqual(rgb(seen.ink), [234, 241, 250]);
    assert.ok(light(seen.surface) < 0.15, seen.surface);
    await context.close();
  });

  await check(`${game}: a theme switched with the game open repaints it at once, without reloading`, async () => {
    const { context, page, frame, colours, errors } = await open(game, { theme: "mono-light" });
    await frame.evaluate(() => {
      globalThis.stillHere = true;
    });
    assert.deepEqual(rgb((await colours()).ink), [10, 10, 10]);
    await page.evaluate(() => globalThis.harness.setTheme("mono-dark"));
    await page.waitForTimeout(100);
    const seen = await colours();
    assert.deepEqual(rgb(seen.ink), [245, 245, 245]);
    assert.ok(light(seen.surface) < 0.15, seen.surface);
    assert.equal(await frame.evaluate(() => globalThis.stillHere), true);
    assert.deepEqual(errors, []);
    await context.close();
  });
}

await browser.close();
server.close();
for (const [state, name, why] of results) console.log(`${state === "ok" ? "ok  " : "FAIL"} ${name}${why ? `\n     ${why}` : ""}`);
const failed = results.filter(([state]) => state !== "ok").length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exitCode = failed ? 1 : 0;

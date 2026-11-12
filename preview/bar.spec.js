import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";
import { start } from "./serve.js";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";
const MODES = [
  { mode: "md", userAgent: undefined },
  { mode: "ios", userAgent: IPHONE },
];
const ENGINES = { chromium, webkit };
const PHONE = { width: 375, height: 812 };
const LANGS = ["es", "ar"];
const SIZING = "border-box";

const server = await start(0);
const base = `http://127.0.0.1:${server.address().port}`;
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
    const box = (node) => {
      if (!node) return null;
      const { left, right } = node.getBoundingClientRect();
      return { left, right };
    };
    const ink = (node) => {
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      let left = Infinity;
      let right = -Infinity;
      for (let text = walker.nextNode(); text; text = walker.nextNode()) {
        if (!text.textContent.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(text);
        const drawn = range.getBoundingClientRect();
        if (!drawn.width) continue;
        left = Math.min(left, drawn.left);
        right = Math.max(right, drawn.right);
      }
      return left <= right ? { left, right } : null;
    };
    const toolbar = document.querySelector(".ftg-bar");
    const title = toolbar.querySelector(":scope > ion-title");
    return {
      mode: document.documentElement.getAttribute("mode"),
      toolbar: box(toolbar),
      title: box(title),
      sizing: getComputedStyle(title).boxSizing,
      words: ink(title),
      score: box(title.querySelector(".ftg-score")),
      start: box(toolbar.querySelector(':scope > ion-buttons[slot="start"]')),
      end: box(toolbar.querySelector(':scope > ion-buttons[slot="end"]')),
      ends: toolbar.querySelectorAll(':scope > ion-buttons[slot="end"] > ion-button').length,
    };
  });

const px = (value) => Math.round(value * 10) / 10;
const span = (box) => `${px(box.left)}–${px(box.right)}`;
const inside = (box, outer, what) =>
  assert.ok(box.left >= outer.left - 0.5 && box.right <= outer.right + 0.5, `${what} at ${span(box)}, the bar at ${span(outer)}`);
const clear = (box, other, what) =>
  assert.ok(!other || box.right <= other.left + 0.5 || box.left >= other.right - 0.5, `${what} at ${span(box)} runs into the buttons at ${span(other)}`);
const middle = (box) => (box.left + box.right) / 2;

function common(seen, mode) {
  assert.equal(seen.mode, mode);
  inside(seen.title, seen.toolbar, "the title");
  assert.equal(seen.sizing, SIZING, `the title's box sizing is ${seen.sizing}, Ionic's own is ${SIZING}`);
}

for (const [engine, launcher] of Object.entries(ENGINES)) {
  const browser = await launcher.launch();
  for (const { mode, userAgent } of MODES) {
    for (const lang of LANGS) {
      const label = (state) => `${engine} · ${mode} · ${lang} · ${state}`;
      const context = await browser.newContext({
        viewport: { width: PHONE.width * 2 + 72, height: PHONE.height + 40 },
        screen: PHONE,
        userAgent,
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => /^ResizeObserver loop/.test(error.message) || errors.push(error.message));
      await page.goto(`${base}/?game=tictactoe&lang=${lang}&bare&closed&screen=${PHONE.width}x${PHONE.height}`);
      await page.evaluate(() => globalThis.harness.open("a"));
      const frame = page.frameLocator("#frame-a");
      await frame.locator(".ftg-bar ion-title.hydrated").waitFor();
      await page.waitForTimeout(300);
      const inFrame = page.frames().find((one) => one.url().endsWith("/frame/tictactoe/a/frame.html"));
      const rtl = lang === "ar";

      await check(label("the list: the title"), async () => {
        const seen = await measure(inFrame);
        common(seen, mode);
        if (mode === "ios") {
          assert.ok(Math.abs(middle(seen.words) - middle(seen.toolbar)) <= 1, `the title's words centre at ${px(middle(seen.words))}, the bar at ${px(middle(seen.toolbar))}`);
        } else {
          const from = rtl ? seen.toolbar.right - seen.words.right : seen.words.left - seen.toolbar.left;
          assert.ok(from <= 24, `the title's words start ${px(from)} px into the bar`);
        }
        clear(seen.words, seen.end, "the title");
      });

      await frame.locator('[data-kit="new"]').first().click();
      await frame.locator(".ftg-bar .ftg-score").waitFor();
      await page.waitForTimeout(400);
      const score = async (buttons) => {
        const seen = await measure(inFrame);
        common(seen, mode);
        assert.equal(seen.ends, buttons, `${seen.ends} buttons at the end`);
        inside(seen.score, seen.toolbar, "the score");
        clear(seen.score, seen.start, "the score");
        clear(seen.score, seen.end, "the score");
        if (mode === "ios") assert.ok(Math.abs(middle(seen.words) - middle(seen.toolbar)) <= 1, `the score centres at ${px(middle(seen.words))}, the bar at ${px(middle(seen.toolbar))}`);
      };
      await check(label("a match: the score"), () => score(1));
      await frame.locator('.ftg-bar [data-kit="retry"]').waitFor({ timeout: 15_000 });
      await page.waitForTimeout(300);
      await check(label("a match, try again: the score"), () => score(2));
      await check(label("no errors"), () => assert.deepEqual(errors, []));
      await context.close();
    }
  }
  await browser.close();
}

server.close();
for (const [state, name, why] of results) if (state !== "ok") console.log(`FAIL ${name}\n     ${why}`);
const failed = results.filter(([state]) => state !== "ok").length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exitCode = failed ? 1 : 0;

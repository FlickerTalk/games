import assert from "node:assert/strict";
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { ROOM_CHROME } from "../kit/src/stage.js";
import { start } from "./serve.js";

export const DEVICES = Object.freeze([
  { name: "360x640", width: 360, height: 640 },
  { name: "384x853", width: 384, height: 853 },
  { name: "430x932", width: 430, height: 932 },
  { name: "1280x800", width: 1280, height: 800 },
]);

const FULLBAR = 52;

export const frameHeight = (device, fill) => (fill ? device.height - FULLBAR : Math.max(300, device.height - ROOM_CHROME));

const linear = (value) => {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
};

export function toneOf([red, green, blue]) {
  const [r, g, b] = [red, green, blue].map(linear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [lightness, Math.hypot(a, bb)];
}

export function toneShares(samples) {
  const count = { bright: 0, light: 0, mid: 0, vivid: 0 };
  for (const pixel of samples) {
    const [lightness, chroma] = toneOf(pixel);
    if (lightness >= 0.8) count.bright += 1;
    if (lightness >= 0.6) count.light += 1;
    if (lightness >= 0.35 && lightness <= 0.55) count.mid += 1;
    if (chroma >= 0.12) count.vivid += 1;
  }
  const share = (value) => (samples.length ? Math.round((1000 * value) / samples.length) / 10 : 0);
  return Object.fromEntries(Object.entries(count).map(([key, value]) => [key, share(value)]));
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

async function phone(engine, base, game, device, { fill, query = "", side = "a", out, hasTouch = false }) {
  const context = await engine.newContext({ viewport: { width: Math.max(device.width * 2 + 72, 800), height: device.height + 40 }, screen: { width: device.width, height: device.height }, deviceScaleFactor: 2, hasTouch });
  const page = await context.newPage();
  const problems = [];
  page.on("pageerror", (error) => problems.push(error.message));
  page.on("console", (message) => message.type() === "error" && problems.push(message.text()));
  await page.goto(`${base}/?game=${game}&lang=en&bare&closed&screen=${device.width}x${device.height}${query}`);
  await page.evaluate((one) => globalThis.harness.open(one), side);
  await page.frameLocator(`#frame-${side}`).locator("canvas").waitFor();
  await page.waitForTimeout(400);
  if (fill) {
    await page.evaluate((one) => globalThis.harness.fill(one, true), side);
    await page.waitForTimeout(400);
  }
  const inner = () => page.frames().find((one) => one.url().endsWith(`/${side}/frame.html`));
  return session({ context, page, problems, inner, side, device, fill, out });
}

function session(s) {
  s.evaluate = (run, arg) => s.inner().evaluate(run, arg);
  s.targets = () => s.evaluate(() => document.querySelector("canvas").parentElement.game.targets().map(({ kind, value, x, y, w, h, strip }) => ({ kind, value, x, y, w, h, strip })));
  s.outside = [];
  s.measure = () =>
    s.evaluate(() => {
      const element = document.querySelector("canvas").parentElement;
      const area = element.getBoundingClientRect();
      const canvas = element.querySelector("canvas");
      const scroller = document.scrollingElement;
      return { frame: { width: innerWidth, height: innerHeight }, element: { width: area.width, height: area.height }, canvas: [canvas.width, canvas.height], scroll: scroller.scrollHeight - scroller.clientHeight, ratio: devicePixelRatio };
    });
  s.at = async (x, y) => {
    const area = await s.page.locator(`#frame-${s.side}`).boundingBox();
    return [area.x + x, area.y + y];
  };
  s.tap = async (kind, value, { inside = true } = {}) => {
    const found = (await s.targets()).find((one) => one.kind === kind && (value === undefined || one.value === value));
    assert.ok(found, `no ${kind} to tap`);
    await s.page.mouse.click(...(await s.at(found.x + found.w / 2, found.y + found.h / 2)));
    await s.page.waitForTimeout(300);
    if (inside) s.outside.push(...(await s.misplaced()));
  };
  s.touch = async (kind, value) => {
    const found = (await s.targets()).find((one) => one.kind === kind && (value === undefined || one.value === value));
    assert.ok(found, `no ${kind} to touch`);
    await s.page.touchscreen.tap(...(await s.at(found.x + found.w / 2, found.y + found.h / 2)));
    await s.page.waitForTimeout(300);
  };
  s.misplaced = async () => {
    const { frame } = await s.measure();
    const out = (one) => one.x < 0 || one.y < 0 || one.x + one.w > frame.width + 1 || one.y + one.h > frame.height + 1;
    return (await s.targets()).filter((one) => !one.strip && out(one)).map((one) => `${one.kind} at ${one.x},${one.y} outside ${frame.width}x${frame.height}`);
  };
  s.shot = async (name) => {
    mkdirSync(s.out, { recursive: true });
    await s.page.locator(`#frame-${s.side}`).screenshot({ path: join(s.out, `${name}.png`) });
  };
  s.samples = (area = null, step = 3) =>
    s.evaluate(
      ({ area, step }) => {
        const canvas = document.querySelector("canvas");
        const ratio = canvas.width / canvas.getBoundingClientRect().width;
        const box = area ?? { x: 0, y: 0, w: canvas.width / ratio, h: canvas.height / ratio };
        const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
        const found = [];
        for (let y = box.y; y < box.y + box.h; y += step) {
          for (let x = box.x; x < box.x + box.w; x += step) {
            const at = (Math.round(y * ratio) * canvas.width + Math.round(x * ratio)) * 4;
            found.push([data[at], data[at + 1], data[at + 2]]);
          }
        }
        return found;
      },
      { area, step },
    );
  return s;
}

async function standard(s, check, label) {
  await check(`${label}: the frame is sized and does not scroll`, async () => {
    const seen = await s.measure();
    assert.ok(seen.scroll <= 1, `scrolls ${seen.scroll}px`);
    const height = frameHeight(s.device, s.fill);
    assert.ok(Math.abs(seen.element.height - height) <= 2, `element ${seen.element.height}, expected ${height}`);
    assert.equal(seen.canvas[0], Math.round(seen.element.width * seen.ratio));
  });
  await check(`${label}: every target inside the frame`, async () => assert.equal((await s.misplaced()).join("; "), ""));
}

const nameField = (s) =>
  s.evaluate(() => {
    const field = document.querySelector("input");
    return { open: !field.hidden, focused: document.activeElement === field, name: document.querySelector("canvas").parentElement.game.state.pick?.choice.name ?? null };
  });

async function renameByTouch(s, check, label) {
  await check(`${label}: a touch on the name opens its field, which stays open and focused`, async () => {
    await s.touch("avatar");
    await s.touch("profile", (await s.targets()).find((one) => one.kind === "profile").value);
    await s.touch("rename");
    assert.deepEqual(await nameField(s), { open: true, focused: true, name: "" });
  });
  await check(`${label}: the name typed is kept on enter`, async () => {
    await s.page.keyboard.type("Zed");
    await s.page.keyboard.press("Enter");
    assert.deepEqual(await nameField(s), { open: false, focused: false, name: "Zed" });
  });
  await check(`${label}: a later touch on the canvas closes the field and keeps the name`, async () => {
    await s.touch("rename");
    await s.page.keyboard.type("dy");
    assert.equal((await nameField(s)).open, true);
    await s.touch("hair", (await s.targets()).find((one) => one.kind === "hair").value);
    assert.deepEqual(await nameField(s), { open: false, focused: false, name: "Zeddy" });
  });
  await s.shot("renamed");
}

export async function walkCanvasGame({ game, out, modes, steps, themes = [], devices = DEVICES, setup = async () => {}, rename = true }) {
  const { chromium, webkit } = await import("playwright");
  const server = await start(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const { results, check } = collector();
  const engines = process.argv.includes("--webkit") ? [["webkit", webkit]] : [["chromium", chromium]];
  for (const [engineName, type] of engines) {
    for (const old of existsSync(out) ? readdirSync(out).filter((name) => name.startsWith(`${engineName}-`)) : []) rmSync(join(out, old), { recursive: true, force: true });
    const engine = await type.launch();
    for (const device of devices) {
      for (const mode of modes.filter((one) => !one.engines || one.engines.includes(engineName))) {
        const label = `${engineName}-${mode.fill ? "fill" : "room"}-${device.name}-${mode.name}`;
        const s = await phone(engine, base, game, device, { ...mode, out: join(out, label) });
        await setup(s);
        await standard(s, check, label);
        await s.shot("1-home");
        await steps(s, { check, label });
        await check(`${label}: every target inside the frame on every screen it reached`, async () => assert.equal(s.outside.join("; "), ""));
        await check(`${label}: no errors`, async () => assert.deepEqual(s.problems, []));
        await s.context.close();
      }
    }
    if (engineName === "chromium" && rename) {
      const label = `${engineName}-touch-${devices[1].name}`;
      const s = await phone(engine, base, game, devices[1], { fill: true, query: modes[0].query, out: join(out, label), hasTouch: true });
      await setup(s);
      await renameByTouch(s, check, label);
      await check(`${label}: no errors`, async () => assert.deepEqual(s.problems, []));
      await s.context.close();
    }
    for (const theme of engineName === "chromium" ? themes : []) {
      const label = `${engineName}-theme-${theme.name}`;
      const s = await phone(engine, base, game, theme.device ?? devices[1], { fill: true, query: `${theme.query ?? ""}&theme=${theme.name}`, out: join(out, label) });
      await setup(s);
      await theme.run(s, { check, label, theme });
      await check(`${label}: no errors`, async () => assert.deepEqual(s.problems, []));
      await s.context.close();
    }
    await engine.close();
  }
  await server.close();
  for (const [status, name, why] of results) console.log(`${status === "ok" ? "ok  " : "FAIL"} ${name}${why ? `: ${why}` : ""}`);
  console.log(`screenshots in ${out}`);
  if (results.some(([status]) => status !== "ok")) process.exitCode = 1;
  return results;
}

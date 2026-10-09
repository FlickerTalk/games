// The built chess package in the plugin frame, in a real browser (Chromium, Playwright): the kit's
// preview harness serves each phone's game in an iframe built like the app's plugin sheet
// (`sandbox="allow-scripts"`, the Content-Security-Policy the core gives a plugin without network)
// and plays the core between the two. What happy-dom cannot show is checked here: the pieces really
// drawn from the sprite, tapping, dragging with a mouse and with a finger, promotion, and that the
// frame breaks no rule of its policy and asks the network for nothing beyond its own package.
//
// Run: npm run frame   (after npm run build; it reads games/chess/dist/)
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { start } from "../../../preview/serve.js";

// Runs in every frame before its own scripts (outside the page's policy). It only listens: a
// policy violation, or any attempt to reach the network, is said on the console.
const WATCH = `
  document.addEventListener("securitypolicyviolation", (e) => console.error("CSP-VIOLATION " + e.violatedDirective + " " + e.blockedURI));
  if (globalThis.XMLHttpRequest) {
    const open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) { console.error("XHR-ATTEMPT " + url); return open.apply(this, arguments); };
  }
  if (globalThis.fetch) {
    const original = globalThis.fetch;
    globalThis.fetch = function (input) { console.error("FETCH-ATTEMPT " + String((input && input.url) || input)); return original.apply(this, arguments); };
  }
`;

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

/** The harness with both phones open, everything the frames do on the console and the network kept. */
async function open(options) {
  // A Samsung S20+ (384 × 853), the same for the harness's phone and the screen, so the kit fits the
  // room the phone shows, as in the app: with Ionic's stylesheet the frame's body is fixed, and
  // nothing scrolls a square into view.
  const context = await browser.newContext({ viewport: { width: 840, height: 900 }, screen: { width: 384, height: 853 }, ...options });
  await context.addInitScript(WATCH);
  const page = await context.newPage();
  const log = { errors: [], requests: [] };
  page.on("console", (message) => ["error", "warning"].includes(message.type()) && log.errors.push(message.text()));
  page.on("pageerror", (error) => log.errors.push(`pageerror: ${error.message}`));
  page.on("request", (request) => log.requests.push(request.url()));
  await page.goto(`${base}/?game=chess&lang=en&screen=384x853`);
  const frames = {};
  for (const side of ["a", "b"]) {
    await page.waitForFunction((id) => document.getElementById(`frame-${id}`), side);
    for (let tries = 0; !frames[side]; tries += 1) {
      frames[side] = page.frames().find((frame) => frame.url().endsWith(`/frame/chess/${side}/frame.html`));
      if (!frames[side]) await page.waitForTimeout(50);
      if (tries > 100) throw new Error(`no frame ${side}`);
    }
    await frames[side].waitForSelector(".ftg");
  }
  return { context, page, frames, log };
}

/** Starts a match from phone A; returns the frames of the side with white and the side with black. */
async function newMatch(page, frames) {
  await frames.a.locator('[data-kit="new"]').first().click();
  await frames.a.waitForSelector(".ftg-player.turn", { timeout: 10_000 });
  await frames.b.waitForSelector(".ftg-player.turn", { timeout: 10_000 });
  for (const frame of [frames.a, frames.b]) await frame.waitForFunction(() => document.querySelectorAll(".cm-chessboard .pieces > g[data-piece]").length === 32);
  await page.waitForTimeout(300);
  const aStarts = await frames.a.locator(".ftg-player.me.turn").count();
  return aStarts ? { white: frames.a, black: frames.b } : { white: frames.b, black: frames.a };
}

const fen = (frame) => frame.evaluate(() => document.querySelector(".ftg-board").dataset.fen);
const pieceOn = (frame, square) => frame.evaluate((name) => document.querySelector(`.pieces > g[data-square="${name}"]`)?.dataset.piece ?? null, square);
const marked = (frame, kind) => frame.evaluate((name) => [...document.querySelectorAll(`.markers g[data-square]`)].filter((g) => g.querySelector(`use.${name}`)).map((g) => g.dataset.square).sort(), kind);

/** The centre of a square, in page coordinates. */
async function centre(frame, square) {
  const box = await frame.locator(`rect.square[data-square="${square}"]`).boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Waits until both phones show the same position, after a move on either. */
async function landed(page, frames, expected) {
  for (const frame of frames) await frame.waitForFunction((want) => document.querySelector(".ftg-board").dataset.fen.startsWith(want), expected, { timeout: 5_000 });
  await page.waitForTimeout(300);
}

async function tapMove(page, frame, uci) {
  await frame.locator(`rect.square[data-square="${uci.slice(0, 2)}"]`).click();
  await page.waitForTimeout(60);
  await frame.locator(`rect.square[data-square="${uci.slice(2, 4)}"]`).click();
}

async function mouseDrag(page, frame, uci) {
  const from = await centre(frame, uci.slice(0, 2));
  const to = await centre(frame, uci.slice(2, 4));
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 6, from.y + 6, { steps: 3 });
  await page.mouse.move(to.x, to.y, { steps: 12 });
  await page.mouse.up();
}

function cleanNetwork(log) {
  // The package's own files, and Ionic, which the app lends the frame (app 1.6.0).
  const allowed = new Set(["/", ...["a", "b"].flatMap((side) => ["frame.html", "frame.js", "ft-ionic/ionic.bundle.css", "ft-ionic/ionic.js", "dist/index.js"].map((file) => `/frame/chess/${side}/${file}`))]);
  return log.requests.filter((url) => !url.startsWith(base) || !allowed.has(new URL(url).pathname));
}

// ---------- A desktop browser, with a mouse ----------
{
  const { context, page, frames, log } = await open({});
  const { white, black } = await newMatch(page, frames);

  await check("each board draws 32 pieces from the sprite, every one with a real box", async () => {
    for (const frame of [white, black]) {
      const boxes = await frame.evaluate(() =>
        [...document.querySelectorAll(".cm-chessboard .pieces > g[data-piece] use")].map((use) => {
          const box = use.getBBox();
          const rect = use.getBoundingClientRect();
          return { href: use.getAttribute("href"), w: box.width, h: box.height, cw: rect.width, ch: rect.height };
        }),
      );
      assert.equal(boxes.length, 32);
      for (const box of boxes) assert.ok(box.w > 0 && box.h > 0 && box.cw > 10 && box.ch > 10, JSON.stringify(box));
    }
  });

  await check("white's board is seen from white, black's from black", async () => {
    const a1 = async (frame) => (await centre(frame, "a1")).y > (await centre(frame, "a8")).y;
    assert.equal(await a1(white), true);
    assert.equal(await a1(black), false);
  });

  await check("a move by tapping (e2, then e4), with its legal squares marked, reaches the other phone", async () => {
    await white.locator('rect.square[data-square="e2"]').click();
    await page.waitForTimeout(100);
    assert.deepEqual(await marked(white, "ftc-move"), ["e3", "e4"]);
    await white.locator('rect.square[data-square="e4"]').click();
    await landed(page, [white, black], "rnbqkbnr/pppppppp/8/8/4P3/");
    assert.equal(await pieceOn(black, "e4"), "wp");
    assert.deepEqual(await marked(black, "ftc-last"), ["e2", "e4"]);
  });

  await check("a move by dragging with a mouse (e7 to e5) on the board seen from black", async () => {
    await mouseDrag(page, black, "e7e5");
    await landed(page, [white, black], "rnbqkbnr/pppp1ppp/8/4p3/4P3/");
    assert.equal(await pieceOn(white, "e5"), "bp");
  });

  await check("a move the rules refuse is not made (a tap from e4 to e6)", async () => {
    await tapMove(page, white, "e4e6");
    await page.waitForTimeout(400);
    assert.match(await fen(white), /^rnbqkbnr\/pppp1ppp\/8\/4p3\/4P3\/8\/PPPP1PPP\/RNBQKBNR w /);
    assert.equal(await pieceOn(white, "e4"), "wp");
    await white.locator('rect.square[data-square="e4"]').click(); // drops it
  });

  await check("zero policy violations, zero network attempts, zero console errors", async () => assert.deepEqual(log.errors, []));
  await check("no request beyond the package's own files", async () => assert.deepEqual(cleanNetwork(log), []));

  await check("control: in this frame fetch, XHR, eval and an inline script are refused", async () => {
    const outcome = await white.evaluate(async () => {
      const said = {};
      try {
        await fetch("./frame.html");
        said.fetch = "allowed";
      } catch {
        said.fetch = "blocked";
      }
      said.xhr = await new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => resolve("allowed");
        xhr.onerror = () => resolve("blocked");
        try {
          xhr.open("GET", "./frame.html");
          xhr.send();
        } catch {
          resolve("blocked");
        }
      });
      try {
        (0, eval)("1");
        said.eval = "allowed";
      } catch {
        said.eval = "blocked";
      }
      const inline = document.createElement("script");
      inline.textContent = "window.__inline = 1";
      document.head.append(inline);
      said.inline = window.__inline ? "allowed" : "blocked";
      return said;
    });
    assert.deepEqual(outcome, { fetch: "blocked", xhr: "blocked", eval: "blocked", inline: "blocked" });
  });
  await context.close();
}

// ---------- A phone, with a finger: taps, a drag, and a promotion ----------
{
  const { context, page, frames, log } = await open({ hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const cdp = await context.newCDPSession(page);
  const touch = (type, points) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points });
  const fingerDrag = async (frame, uci) => {
    const from = await centre(frame, uci.slice(0, 2));
    const to = await centre(frame, uci.slice(2, 4));
    await touch("touchStart", [from]);
    for (let step = 1; step <= 12; step += 1) {
      await touch("touchMove", [{ x: from.x + ((to.x - from.x) * step) / 12, y: from.y + ((to.y - from.y) * step) / 12 }]);
      await page.waitForTimeout(16);
    }
    await touch("touchEnd", []);
  };
  const tapTouch = async (frame, uci) => {
    await frame.locator(`rect.square[data-square="${uci.slice(0, 2)}"]`).tap();
    await page.waitForTimeout(60);
    await frame.locator(`rect.square[data-square="${uci.slice(2, 4)}"]`).tap();
  };
  const { white, black } = await newMatch(page, frames);

  await check("phone: taps and finger drags play a game up to a promotion", async () => {
    const line = [
      ["a2a4", white, tapTouch, "rnbqkbnr/pppppppp/8/8/P7/"],
      ["b7b5", black, fingerDrag, "rnbqkbnr/p1pppppp/8/1p6/P7/"],
      ["a4b5", white, fingerDrag, "rnbqkbnr/p1pppppp/8/1P6/8/"],
      ["a7a6", black, tapTouch, "rnbqkbnr/2pppppp/p7/1P6/"],
      ["b5a6", white, tapTouch, "rnbqkbnr/2pppppp/P7/8/"],
      ["c8b7", black, tapTouch, "rn1qkbnr/1bpppppp/P7/"],
      ["a6b7", white, tapTouch, "rn1qkbnr/1Ppppppp/8/"],
      ["b8c6", black, fingerDrag, "r2qkbnr/1Ppppppp/2n5/"],
    ];
    for (const [uci, frame, how, after] of line) {
      await how(frame, uci);
      await landed(page, [white, black], after);
    }
  });

  await check("phone: promotion asks which piece, and the knight picked lands on both phones", async () => {
    await tapTouch(white, "b7a8");
    await white.waitForSelector(".promotion-dialog-button-group[data-piece='wn']", { timeout: 3_000 });
    const names = await white.evaluate(() => [...document.querySelectorAll(".promotion-dialog-button-group")].map((g) => g.getAttribute("aria-label")));
    assert.deepEqual(names, ["Queen", "Rook", "Bishop", "Knight"]);
    await white.locator(".promotion-dialog-button-group[data-piece='wn'] rect").tap();
    await landed(page, [white, black], "N2qkbnr/");
    assert.equal(await pieceOn(black, "a8"), "wn");
  });

  await check("phone: the board takes the sheet's width, with squares a finger can hit", async () => {
    const box = await white.locator(".cm-chessboard").boundingBox();
    assert.ok(box.width >= 320 && box.width <= 360, `board ${box.width}px`);
    assert.ok(box.width / 8 >= 40, `square ${box.width / 8}px`);
  });

  await check("phone: zero policy violations, network attempts or console errors", async () => assert.deepEqual(log.errors, []));
  await check("phone: no request beyond the package's own files", async () => assert.deepEqual(cleanNetwork(log), []));
  await context.close();
}

await browser.close();
server.close();
for (const [status, name, why] of results) console.log(`${status.padEnd(4)} ${name}${why ? `\n     ${why.split("\n").join("\n     ")}` : ""}`);
const failed = results.filter(([status]) => status !== "ok").length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);

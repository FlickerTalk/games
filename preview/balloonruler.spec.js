import assert from "node:assert/strict";
import { toneShares, walkCanvasGame } from "./canvas-walk.js";

const OUT = "/private/tmp/ftgames-balloonruler-shots";

const game = (s, run, arg) => s.evaluate(run, arg);

const seen = (s) =>
  game(s, () => {
    const { state } = document.getElementById("view").game;
    const { round, layout } = state;
    if (!round) return { screen: state.screen };
    const share = round.numbers[round.shot ? round.shot.index : round.guesses.length].share;
    const x = (place) => layout.ruler.x + 8 + place * (layout.ruler.w - 16);
    return { screen: state.screen, guesses: round.guesses.length, truth: x(share), far: x(share > 0.5 ? 0.03 : 0.97), y: layout.ruler.y + layout.ruler.h / 2, stars: state.last?.stars ?? null, flying: Boolean(round.shot) };
  });

async function shoot(s, pick, { hold = 0 } = {}) {
  const now = await seen(s);
  const [x, y] = await s.at(now[pick], now.y);
  await s.page.mouse.move(x + (now[pick] < 80 ? 40 : -40), y);
  await s.page.mouse.down();
  await s.page.mouse.move(x, y, { steps: 4 });
  if (hold) await s.page.waitForTimeout(hold);
  return () => s.page.mouse.up();
}

async function waitFree(s) {
  for (let waited = 0; waited < 6000 && (await seen(s)).flying; waited += 150) await s.page.waitForTimeout(150);
}

const finish = (s) =>
  game(s, async () => {
    const view = document.getElementById("view").game;
    view.state.round = { ...view.state.round, time: view.state.round.seconds - 0.2 };
    await new Promise((resolve) => setTimeout(resolve, 3200));
    await view.idle();
    return view.state.screen;
  });

async function steps(s, { check, label }) {
  await s.tap("play");
  await s.shot("2-hint");
  const release = await shoot(s, "truth", { hold: 250 });
  await s.shot("3-aiming");
  await release();
  await s.page.waitForTimeout(250);
  await s.shot("4-flight");
  await s.page.waitForTimeout(600);
  const close = await seen(s);
  await s.shot("5-close");
  await check(`${label}: touching the ruler at the true place lands a three-star shot`, async () => assert.deepEqual([close.guesses, close.stars], [1, 3]));
  await waitFree(s);
  await (await shoot(s, "far"))();
  await s.page.waitForTimeout(800);
  const after = await seen(s);
  await s.shot("6-far");
  await check(`${label}: a far guess still counts and the round goes on`, async () => assert.deepEqual([after.guesses, after.stars, after.screen], [2, 1, "play"]));
  await waitFree(s);
  await s.tap("pause");
  await s.shot("7-pause");
  await s.tap("resume");
  await s.tap("speaker");
  await s.shot("8-volume");
  await s.tap("speaker");
  await check(`${label}: a round ends on the star screen`, async () => assert.equal(await finish(s), "end"));
  await s.shot("9-end");
  await s.tap("home");
  await s.tap("variant", "long");
  await s.shot("10-long-ruler");
  await s.tap("looks");
  await s.shot("11-tips");
  await s.tap("tab", "place");
  await s.shot("12-places");
  await s.tap("done");
  await s.tap("avatar");
  await s.shot("13-avatar");
}

async function playScreen(s, { check, label, theme }) {
  await s.tap("play");
  await game(s, () => (document.getElementById("view").game.state.hint = false));
  await (await shoot(s, "truth"))();
  await s.page.waitForTimeout(1100);
  await s.shot("play");
  const shares = toneShares(await s.samples());
  console.log(`${label}: L>=0.8 ${shares.bright}%, L>=0.6 ${shares.light}%, L 0.35-0.55 ${shares.mid}%, vivid ${shares.vivid}%`);
  if (!theme.name.endsWith("-dark")) return;
  await check(`${label}: little of the screen is bright on a dark page`, async () => assert.ok(shares.bright < 12, `${shares.bright}% at L>=0.8`));
}

await walkCanvasGame({
  game: "balloonruler",
  out: OUT,
  modes: [
    { name: "flick", fill: true, query: "&solo" },
    { name: "alone", fill: false, query: "&alone", engines: ["chromium"] },
  ],
  steps,
  themes: ["mono-dark", "mono-light", "ember-dark"].map((name) => ({ name, query: "&solo", run: playScreen })),
});

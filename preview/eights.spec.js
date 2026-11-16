import assert from "node:assert/strict";
import { walkBoardGame } from "./board-walk.js";

const OUT = "/private/tmp/ftgames-eights-shots";
const button = (key) => `.ftg-board button[data-key="${key}"]`;
const isEight = (key) => /^\d+$/.test(key) && Number(key) % 13 === 7;

const table = (s) => s.evaluate(() => {
  const { state, myTurn } = document.querySelector("#view").table.view;
  return { phase: state.phase, myTurn };
});
const widths = (s) => s.evaluate(() => [...document.querySelectorAll(".ftg-board button[data-card]")].map((one) => one.getBoundingClientRect().width));

async function toPlaying(s) {
  for (let tries = 0; tries < 40; tries += 1) {
    const { phase, myTurn } = await table(s);
    if (phase !== "shuffle" && myTurn) return;
    if (phase === "over" || phase === "done") return;
    await s.page.waitForTimeout(200);
  }
}

async function playOne(s, { eight } = {}) {
  await toPlaying(s);
  if (!(await s.myTurn())) return false;
  const open = await s.open();
  const cards = open.filter((one) => /^\d+$/.test(one.key));
  const chosen = cards.find((one) => isEight(one.key) === Boolean(eight)) ?? cards[0] ?? open.find((one) => one.key === "stock");
  if (!chosen) return false;
  await s.tap(button(chosen.key));
  if (!isEight(chosen.key)) return false;
  if (eight) await s.shot("3-suits");
  await s.tap(button("h"));
  return true;
}

await walkBoardGame({
  game: "eights",
  out: OUT,
  minBoard: 300,
  steps: async (s, { check, label }) => {
    await toPlaying(s);
    await s.page.waitForTimeout(1600);
    await s.shot("1-start");
    if (s.run.device.width < 720) {
      await check(`${label}: every card in the hand leaves 44 px to touch`, async () => {
        for (const width of await widths(s)) assert.ok(width >= 43.5, `a card ${width.toFixed(1)} px wide`);
      });
    }
    let suits = false;
    for (let ply = 0; ply < 6; ply += 1) suits = (await playOne(s, { eight: !suits })) || suits;
    await s.page.waitForTimeout(900);
    await s.shot("2-played");
  },
});

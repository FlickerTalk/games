import assert from "node:assert/strict";
import { walkBoardGame } from "./board-walk.js";

const OUT = "/private/tmp/ftgames-cardcorner-shots";
const button = (key) => `.ftg-board button[data-key="${key}"]`;
const CHOICES = { pairs16: ["pairs", "p16"], pairs24: ["pairs", "p24"], war: ["war"], rummy: ["rummy"], fish: ["fish"] };

const table = (s) => s.evaluate(() => {
  const { state, myTurn, phase } = document.querySelector("#view").table.view;
  return { phase: state.phase, game: state.game, step: state.table?.step ?? null, took: state.table?.took ?? null, myTurn, over: phase !== "play" };
});
const reach = (s) => s.evaluate(() => [...document.querySelectorAll(".ftg-board button[data-key]")].filter((one) => !one.disabled).map((one) => {
  const area = one.getBoundingClientRect();
  return { key: one.dataset.key, width: area.width, height: area.height };
}));

async function until(s, ready) {
  for (let tries = 0; tries < 60; tries += 1) {
    const seen = await table(s);
    if (seen.over || ready(seen)) return seen;
    await s.page.waitForTimeout(150);
  }
  return table(s);
}

async function move(s) {
  const seen = await until(s, (one) => one.phase === "play" && one.myTurn);
  if (seen.over || !seen.myTurn) return;
  const open = await s.open();
  const first = (test) => open.find((one) => test(one.key));
  if (seen.game === "war") await s.tap(button("mine"));
  else if (seen.game === "pairs" || seen.game === "fish") await s.tap(button((first((key) => /^\d+$/.test(key)) ?? first((key) => key === "pond")).key));
  else if (seen.step === "draw") await s.tap(button("stock"));
  else if (first((key) => key === "lay")) await s.tap(button("lay"));
  else {
    await s.tap(button(first((key) => /^\d+$/.test(key) && Number(key) !== seen.took).key));
    await s.tap(button("discard"));
  }
}

async function round(s, choice, { check, label }) {
  await until(s, (one) => one.phase === "choose" && one.myTurn);
  await s.page.waitForTimeout(300);
  if (choice === "pairs16") await s.shot("0-chooser");
  await s.tap(button(CHOICES[choice][0]));
  if (choice === "pairs16") await s.shot("0-pairs-sizes");
  if (CHOICES[choice][1]) await s.tap(button(CHOICES[choice][1]));
  await until(s, (one) => one.phase === "play" && one.myTurn);
  await s.page.waitForTimeout(500);
  await s.shot(`${choice}-1-start`);
  for (let turn = 0; turn < (choice === "war" ? 9 : 6); turn += 1) await move(s);
  await until(s, (one) => one.phase === "play" && one.myTurn);
  await s.page.waitForTimeout(900);
  await s.shot(`${choice}-2-played`);
  if (s.run.device.width < 720) {
    await check(`${label}: ${choice}: everything open to touch is at least 44 px wide and 36 px tall`, async () => {
      for (const { key, width, height } of await reach(s)) assert.ok(width >= 43.5 && height >= 36, `${key} is ${width.toFixed(1)} x ${height.toFixed(1)}`);
    });
  }
}

await walkBoardGame({
  game: "cardcorner",
  out: OUT,
  minBoard: 300,
  steps: async (s, context) => {
    const choices = Object.keys(CHOICES);
    for (const [at, choice] of choices.entries()) {
      await round(s, choice, context);
      if (at === choices.length - 1) break;
      await s.tap('[data-kit="back"]');
      await s.tap('[data-kit="new"]');
    }
  },
});

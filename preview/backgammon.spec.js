import assert from "node:assert/strict";
import { walkBoardGame } from "./board-walk.js";

const OUT = "/private/tmp/ftgames-backgammon-shots";
const place = (key) => `.ftg-board button[data-key="${key}"]`;
const marked = (buttons, name) => buttons.filter((one) => one.mark.split(" ").includes(name));

async function rolled(s) {
  for (let tries = 0; tries < 40; tries += 1) {
    const open = await s.open();
    if (marked(open, "can").length || open.some((one) => one.key === "pass")) return open;
    await s.page.waitForTimeout(200);
  }
  return [];
}

async function playTurn(s) {
  await s.waitTurn();
  for (let step = 0; step < 6 && (await s.myTurn()); step += 1) {
    const open = await rolled(s);
    const can = marked(open, "can");
    if (!can.length) {
      if (open.some((one) => one.key === "pass")) await s.tap(place("pass"));
      return;
    }
    await s.tap(place(can.at(-1).key));
    const to = marked(await s.open(), "to");
    if (!to.length) return;
    await s.tap(place(to[0].key));
  }
}

await walkBoardGame({
  game: "backgammon",
  out: OUT,
  minBoard: 320,
  steps: async (s, { check, label }) => {
    await s.waitTurn();
    const open = marked(await rolled(s), "can");
    await s.page.waitForTimeout(600);
    await s.shot("1-start");
    await check(`${label}: the user's checkers that may move are open`, async () => assert.ok(open.length >= 1, `${open.length} points`));
    await s.tap(place(open.at(-1).key));
    await s.shot("2-chosen");
    await check(`${label}: a chosen checker shows where it may go`, async () => assert.ok(marked(await s.open(), "to").length, "nowhere to go"));
    await s.tap(place(marked(await s.open(), "to")[0].key));
    for (let turn = 0; turn < 3; turn += 1) await playTurn(s);
    await s.page.waitForTimeout(900);
    await s.shot("3-played");
  },
});

import assert from "node:assert/strict";
import { walkBoardGame } from "./board-walk.js";

const OUT = "/private/tmp/ftgames-fourinarow-shots";
const column = (key) => `.ftg-board button[data-col="${key}"]`;

async function dropOne(s) {
  await s.waitTurn();
  const open = await s.open();
  if (!open.length) return;
  await s.tap(column(open[Math.floor(open.length / 2)].key));
}

await walkBoardGame({
  game: "fourinarow",
  out: OUT,
  minBoard: 308,
  steps: async (s, { check, label }) => {
    await s.waitTurn();
    await s.shot("1-start");
    await check(`${label}: every column is open on the user's first turn`, async () => assert.equal((await s.open()).length, 7));
    await s.tap(column(3));
    await s.shot("2-dropping");
    for (let ply = 0; ply < 3; ply += 1) await dropOne(s);
    await s.page.waitForTimeout(900);
    await s.shot("3-played");
    await check(`${label}: the last disc's column is marked`, async () => assert.ok((await s.evaluate(() => document.querySelectorAll('.ftg-board button[data-mark~="last"]').length)) === 1));
  },
});

import assert from "node:assert/strict";
import { walkBoardGame } from "./board-walk.js";
import { toneShares } from "./canvas-walk.js";

const OUT = "/private/tmp/ftgames-tictactoe-shots";
const cell = (key) => `.ftg-board button[data-key="${key}"]`;
const marked = (buttons, name) => buttons.filter((one) => one.mark.split(" ").includes(name));

async function playOne(s) {
  await s.waitTurn();
  const free = marked(await s.open(), "can");
  if (free.length) await s.tap(cell(free[0].key));
}

const over = (s) => s.evaluate(() => document.querySelector("#view").table.view?.phase === "over");

await walkBoardGame({
  game: "tictactoe",
  out: OUT,
  minBoard: 200,
  steps: async (s, { check, label }) => {
    await s.waitTurn();
    await s.shot("1-start");
    const free = marked(await s.open(), "can");
    await check(`${label}: every free cell is offered on the user's turn`, async () => assert.ok(free.length >= 8, `${free.length} free cells offered`));
    await s.tap(cell(free[0].key));
    await s.shot("2-placed");
    await s.waitTurn();
    const taken = (await s.open()).find((one) => !one.mark.split(" ").includes("can"));
    await s.tap(cell(taken.key));
    await s.shot("3-taken-cell-tapped");
    for (let ply = 0; ply < 6 && !(await over(s)); ply += 1) await playOne(s);
    await s.page.waitForTimeout(2600);
    await s.shot("4-round-over");
    if (s.run.theme.endsWith("-dark")) console.log(`${label}: a finished board, L>=0.8 ${toneShares(await s.samples()).bright}%`);
    await s.tap('[data-kit="again"]');
    for (let ply = 0; ply < 2; ply += 1) await playOne(s);
    await s.page.waitForTimeout(1800);
    await s.shot("5-next-round");
  },
});

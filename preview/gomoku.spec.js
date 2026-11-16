import assert from "node:assert/strict";
import { walkBoardGame } from "./board-walk.js";

const OUT = "/private/tmp/ftgames-gomoku-shots";
const NEAR_MIDDLE = [112, 113, 97, 127, 111, 98, 126, 128, 96, 114, 82, 142];
const crossing = (key) => `.ftg-board button[data-key="${key}"]`;
const CONFIRM = ".ftg-board button[data-ghost]";

const board = (s) => s.evaluate(() => document.querySelector("#view").table.view.state.cells);
const marked = (s, name) => s.evaluate((mark) => [...document.querySelectorAll(".ftg-board button[data-mark]")].filter((one) => one.dataset.mark.split(" ").includes(mark)).map((one) => Number(one.dataset.key)), name);

async function freeNearMiddle(s) {
  const cells = await board(s);
  return NEAR_MIDDLE.find((cell) => cells[cell] === null) ?? cells.findIndex((one) => one === null);
}

async function playOne(s) {
  await s.waitTurn();
  if (!(await s.myTurn())) return;
  await s.tap(crossing(await freeNearMiddle(s)));
  await s.tap(CONFIRM);
}

await walkBoardGame({
  game: "gomoku",
  out: OUT,
  minBoard: 320,
  steps: async (s, { check, label }) => {
    await s.waitTurn();
    await s.page.waitForTimeout(600);
    await s.shot("1-start");
    const chosen = await freeNearMiddle(s);
    await s.tap(crossing(chosen));
    await s.shot("2-chosen");
    await check(`${label}: a first tap chooses the crossing and offers to confirm it`, async () => {
      assert.deepEqual(await marked(s, "chosen"), [chosen]);
      assert.equal(await s.evaluate(() => document.querySelector(".ftg-board button[data-ghost]")?.dataset.ghost), String(chosen));
    });
    await s.tap(CONFIRM);
    await check(`${label}: the second tap places the stone`, async () => assert.notEqual((await board(s))[chosen], null));
    for (let ply = 0; ply < 3; ply += 1) await playOne(s);
    await s.page.waitForTimeout(900);
    await s.shot("3-played");
  },
});

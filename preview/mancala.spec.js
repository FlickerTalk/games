import assert from "node:assert/strict";
import { walkBoardGame } from "./board-walk.js";

const OUT = "/private/tmp/ftgames-mancala-shots";
const pit = (key) => `.ftg-board button[data-key="${key}"]`;

async function sowOne(s) {
  await s.waitTurn();
  const open = await s.open();
  if (!open.length) return;
  await s.tap(pit(open.at(-1).key));
}

await walkBoardGame({
  game: "mancala",
  out: OUT,
  minBoard: 352,
  steps: async (s, { check, label }) => {
    await s.waitTurn();
    await s.shot("1-start");
    await check(`${label}: all six of the user's pits are open on the first turn`, async () => assert.equal((await s.open()).length, 6));
    const home = await s.evaluate(() => {
      const { state, mySide } = document.querySelector("#view").table.view;
      return [0, 1, 2, 3, 4, 5].find((n) => state.pits[(mySide === 1 ? 7 : 0) + n] === 6 - n) ?? 0;
    });
    await s.tap(`.ftg-board button[data-move="${home}"]`);
    await s.shot("2-sowing");
    await check(`${label}: the last seed in the user's store gives the turn again`, async () => assert.ok(await s.myTurn()));
    for (let ply = 0; ply < 3; ply += 1) await sowOne(s);
    await s.page.waitForTimeout(5000);
    await s.shot("3-played");
    await check(`${label}: the pit last sown from is marked`, async () => assert.equal(await s.evaluate(() => document.querySelectorAll('.ftg-board button[data-mark~="last"]').length), 1));
  },
});

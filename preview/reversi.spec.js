import assert from "node:assert/strict";
import { walkBoardGame } from "./board-walk.js";

const OUT = "/private/tmp/ftgames-reversi-shots";
const cell = (key) => `.ftg-board button[data-key="${key}"]`;
const marked = (s, name) => s.evaluate((mark) => [...document.querySelectorAll(".ftg-board button[data-mark]")].filter((one) => one.dataset.mark.split(" ").includes(mark)).map((one) => one.dataset.key), name);

async function playOne(s) {
  await s.waitTurn();
  const open = await s.open();
  if (open.length) await s.tap(cell(open.at(-1).key));
}

await walkBoardGame({
  game: "reversi",
  out: OUT,
  minBoard: 320,
  steps: async (s, { check, label }) => {
    await s.waitTurn();
    await s.page.waitForTimeout(2600);
    await s.shot("1-start");
    const open = await s.open();
    await check(`${label}: the cells the user may play are open and ringed`, async () => assert.deepEqual(open.map((one) => one.mark), open.map(() => "can")));
    await s.tap(cell(open.at(-1).key));
    await s.shot("2-turning");
    await check(`${label}: a move turns the discs it brackets`, async () => assert.ok((await marked(s, "turned")).length > 0, "nothing turned"));
    for (let ply = 0; ply < 3; ply += 1) await playOne(s);
    await s.page.waitForTimeout(4000);
    await s.shot("3-played");
  },
});

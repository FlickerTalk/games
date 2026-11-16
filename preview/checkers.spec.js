import assert from "node:assert/strict";
import { walkBoardGame } from "./board-walk.js";

const OUT = "/private/tmp/ftgames-checkers-shots";
const square = (key) => `.ftg-board button[data-key="${key}"]`;
const marked = (buttons, name) => buttons.find((one) => one.mark.split(" ").includes(name));

async function playOne(s) {
  await s.waitTurn();
  const open = await s.open();
  if (!open.length) return;
  await s.tap(square(open.at(-1).key));
  for (let step = 0; step < 4; step += 1) {
    const to = marked(await s.open(), "to");
    if (!to) return;
    await s.tap(square(to.key));
  }
}

await walkBoardGame({
  game: "checkers",
  out: OUT,
  minBoard: 320,
  steps: async (s, { check, label }) => {
    await s.waitTurn();
    await s.shot("1-start");
    const open = await s.open();
    await s.tap(square(open.at(-1).key));
    await s.shot("2-selected");
    await check(`${label}: a tapped piece shows where it may go`, async () => assert.ok(marked(await s.open(), "to"), "no square to go to"));
    await s.tap(square(marked(await s.open(), "to").key));
    for (let ply = 0; ply < 3; ply += 1) await playOne(s);
    await s.page.waitForTimeout(900);
    await s.shot("3-played");
  },
});

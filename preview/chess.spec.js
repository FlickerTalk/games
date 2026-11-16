import assert from "node:assert/strict";
import { walkBoardGame } from "./board-walk.js";

const OUT = "/private/tmp/ftgames-chess-shots";
const square = (key) => `.ftg-board button[data-key="${key}"]`;
const marked = (buttons, name) => buttons.filter((one) => one.mark.split(" ").includes(name));

async function playOne(s, pick) {
  await s.waitTurn();
  const pieces = marked(await s.open(), "can");
  if (!pieces.length) return;
  await s.tap(square(pick(pieces).key));
  const targets = marked(await s.open(), "to");
  if (!targets.length) return;
  await s.tap(square(pick(targets).key));
  if (await s.frame.locator(square("promote-q")).count()) await s.tap(square("promote-q"));
}

await walkBoardGame({
  game: "chess",
  out: OUT,
  minBoard: 320,
  steps: async (s, { check, label }) => {
    await s.waitTurn();
    await s.shot("1-start");
    const pieces = marked(await s.open(), "can");
    await check(`${label}: the user's pieces that may move are open`, async () => assert.ok(pieces.length >= 10, `${pieces.length} pieces`));
    await s.tap(square(pieces.find((one) => /[d-e][27]/.test(one.key))?.key ?? pieces[0].key));
    await s.shot("2-selected");
    await check(`${label}: a tapped piece shows where it may go`, async () => assert.ok(marked(await s.open(), "to").length, "no square to go to"));
    await s.tap(square(marked(await s.open(), "to").at(-1).key));
    for (let ply = 0; ply < 3; ply += 1) await playOne(s, (list) => list.at(-1));
    await s.page.waitForTimeout(900);
    await s.shot("3-played");
  },
});

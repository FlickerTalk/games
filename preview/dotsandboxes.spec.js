import assert from "node:assert/strict";
import { walkBoardGame } from "./board-walk.js";

const OUT = "/private/tmp/ftgames-dotsandboxes-shots";
const line = (key) => `.ftg-board button[data-line="${key}"]`;
const BOX_ZERO = [0, 4, 20, 21];

function tapsNearLines() {
  const missed = [];
  for (const button of document.querySelectorAll(".ftg-board button[data-line]")) {
    const area = button.getBoundingClientRect();
    const [x, y, step] = [area.x + area.width / 2, area.y + area.height / 2, area.width];
    const flat = Number(button.dataset.line) < 20;
    const near = flat ? [[0.3, 0.1], [-0.3, -0.1], [0, 0.4]] : [[0.1, 0.3], [-0.1, -0.3], [0.4, 0]];
    for (const [dx, dy] of near) {
      const hit = document.elementFromPoint(x + dx * step, y + dy * step)?.closest("button[data-line]");
      if (hit !== button) missed.push(`${button.dataset.line} at ${dx},${dy} went to ${hit?.dataset.line ?? "nothing"}`);
    }
  }
  return missed;
}

async function playOne(s) {
  await s.waitTurn();
  const open = await s.open();
  if (!open.length) return;
  const wanted = BOX_ZERO.find((key) => open.some((one) => Number(one.key) === key));
  await s.tap(line(wanted ?? open.at(-1).key));
}

await walkBoardGame({
  game: "dotsandboxes",
  out: OUT,
  minBoard: 300,
  steps: async (s, { check, label }) => {
    await s.waitTurn();
    await s.shot("1-start");
    await check(`${label}: a tap beside a line, off its middle, goes to that line`, async () => assert.deepEqual(await s.evaluate(tapsNearLines), []));
    const first = (await s.open()).find((one) => Number(one.key) === 0) ?? (await s.open())[0];
    await s.tap(line(first.key));
    await check(`${label}: a tapped line is drawn in the user's mark`, async () => {
      const mark = await s.evaluate((key) => document.querySelector(`.ftg-board button[data-line="${key}"]`).dataset.mark ?? "", first.key);
      assert.match(mark, /\bd[01]\b/);
    });
    await s.shot("2-drawn");
    for (let ply = 0; ply < 3; ply += 1) await playOne(s);
    await s.page.waitForTimeout(1500);
    await s.shot("3-played");
  },
});
